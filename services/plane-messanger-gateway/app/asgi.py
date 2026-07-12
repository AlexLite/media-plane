import ast
import hashlib
import base64
import hmac
import html
import json
import logging
import os
import re
import secrets
import smtplib
import sqlite3
import time
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from pathlib import Path
from typing import Any
from uuid import UUID, uuid4

import httpx
import psycopg
from cryptography.fernet import Fernet


logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("plane-messanger-gateway")


class Settings:
    plane_web_url = os.getenv("PLANE_WEB_URL", "http://plane.example.local")
    plane_api_base_url = os.getenv("PLANE_API_BASE_URL") or plane_web_url
    plane_api_token = os.getenv("PLANE_API_TOKEN", "")
    notifier_token_encryption_key = os.getenv("NOTIFIER_TOKEN_ENCRYPTION_KEY", "")
    plane_webhook_secret = os.getenv("PLANE_WEBHOOK_SECRET", "")
    plane_database_url = os.getenv("PLANE_DATABASE_URL", "postgresql://plane:plane@plane-db:5432/plane")
    vk_group_token = os.getenv("VK_GROUP_TOKEN", "")
    vk_api_version = os.getenv("VK_API_VERSION", "5.199")
    vk_api_endpoint = os.getenv("VK_API_ENDPOINT", "https://api.vk.ru/method/messages.send")
    vk_callback_secret = os.getenv("VK_CALLBACK_SECRET", "")
    vk_confirmation_code = os.getenv("VK_CONFIRMATION_CODE", "")
    vk_debug = os.getenv("VK_DEBUG", "false").lower() in {"1", "true", "yes", "on"}
    admin_token = os.getenv("ADMIN_TOKEN", "change-me")
    skip_actor = os.getenv("SKIP_ACTOR", "true").lower() in {"1", "true", "yes", "on"}
    sqlite_path = os.getenv("SQLITE_PATH", "/data/notifier.db")
    link_confirm_ttl_minutes = int(os.getenv("LINK_CONFIRM_TTL_MINUTES", "15"))
    link_confirm_max_attempts = int(os.getenv("LINK_CONFIRM_MAX_ATTEMPTS", "5"))
    vk_context_ttl_hours = int(os.getenv("VK_CONTEXT_TTL_HOURS", "24"))
    smtp_host = os.getenv("SMTP_HOST") or os.getenv("EMAIL_HOST", "")
    smtp_port = int(os.getenv("SMTP_PORT") or os.getenv("EMAIL_PORT", "587"))
    smtp_username = os.getenv("SMTP_USERNAME") or os.getenv("EMAIL_HOST_USER", "")
    smtp_password = os.getenv("SMTP_PASSWORD") or os.getenv("EMAIL_HOST_PASSWORD", "")
    smtp_from = os.getenv("SMTP_FROM") or os.getenv("EMAIL_FROM") or os.getenv("DEFAULT_FROM_EMAIL") or os.getenv("SERVER_EMAIL") or smtp_username
    smtp_use_tls = (os.getenv("SMTP_USE_TLS") or os.getenv("EMAIL_USE_TLS") or "true").lower() in {"1", "true", "yes", "on"}
    smtp_use_ssl = (os.getenv("SMTP_USE_SSL") or os.getenv("EMAIL_USE_SSL") or "false").lower() in {"1", "true", "yes", "on"}
    plane_secret_key = os.getenv("PLANE_SECRET_KEY") or os.getenv("SECRET_KEY", "")


settings = Settings()
CHANNEL_VK = "vk"
CHANNEL_READ_FALLBACKS: dict[str, int] = {}
VK_RESPONSE_TOKEN_LABEL = "vk-response"
VK_RESPONSE_TOKEN_DESCRIPTION = "Auto-created by plane-messanger-gateway for VK replies."


def validate_required_settings() -> None:
    required = {
        "ADMIN_TOKEN": settings.admin_token,
        "PLANE_WEBHOOK_SECRET": settings.plane_webhook_secret,
        "VK_CALLBACK_SECRET": settings.vk_callback_secret,
    }
    missing = [name for name, value in required.items() if not value]
    if missing:
        raise RuntimeError(f"Missing required notifier settings: {', '.join(missing)}")


validate_required_settings()


def init_sqlite() -> None:
    Path(settings.sqlite_path).parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(settings.sqlite_path) as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS user_links (
              plane_user_id TEXT PRIMARY KEY,
              vk_user_id INTEGER UNIQUE NOT NULL,
              email TEXT,
              display_name TEXT,
              enabled INTEGER NOT NULL DEFAULT 1,
              vk_allowed INTEGER NOT NULL DEFAULT 1,
              last_error TEXT,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS link_codes (
              code TEXT PRIMARY KEY,
              plane_user_id TEXT NOT NULL,
              expires_at TEXT NOT NULL,
              used_at TEXT
            );
            CREATE TABLE IF NOT EXISTS pending_email_links (
              vk_user_id INTEGER PRIMARY KEY,
              plane_user_id TEXT NOT NULL,
              email TEXT NOT NULL,
              code_hash TEXT NOT NULL,
              attempts INTEGER NOT NULL DEFAULT 0,
              expires_at TEXT NOT NULL,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS processed_events (
              delivery_id TEXT PRIMARY KEY,
              created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS delivery_log (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              delivery_id TEXT,
              plane_user_id TEXT,
              vk_user_id INTEGER,
              issue_id TEXT,
              status TEXT NOT NULL,
              error TEXT,
              created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS user_api_tokens (
              plane_user_id TEXT PRIMARY KEY,
              vk_user_id INTEGER UNIQUE NOT NULL,
              token_encrypted TEXT NOT NULL,
              token_hash TEXT NOT NULL,
              enabled INTEGER NOT NULL DEFAULT 1,
              last_error TEXT,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL,
              last_used_at TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_user_api_tokens_vk_user
              ON user_api_tokens(vk_user_id);
            CREATE TABLE IF NOT EXISTS vk_message_contexts (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              vk_user_id INTEGER NOT NULL,
              plane_user_id TEXT NOT NULL,
              issue_id TEXT NOT NULL,
              project_id TEXT,
              workspace_slug TEXT,
              delivery_id TEXT,
              vk_message_id TEXT,
              actor_plane_user_id TEXT,
              actor_name TEXT,
              created_at TEXT NOT NULL,
              expires_at TEXT NOT NULL,
              last_used_at TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_vk_message_contexts_user_expiry
              ON vk_message_contexts(vk_user_id, expires_at);
            CREATE TABLE IF NOT EXISTS pending_vk_replies (
              vk_user_id INTEGER PRIMARY KEY,
              context_id INTEGER NOT NULL,
              created_at TEXT NOT NULL,
              expires_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS user_channels (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              plane_user_id TEXT NOT NULL,
              channel TEXT NOT NULL,
              channel_user_id TEXT NOT NULL,
              enabled INTEGER NOT NULL DEFAULT 1,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL,
              UNIQUE(plane_user_id, channel),
              UNIQUE(channel, channel_user_id)
            );
            CREATE INDEX IF NOT EXISTS idx_user_channels_channel_user
              ON user_channels(channel, channel_user_id);
            CREATE TABLE IF NOT EXISTS message_contexts (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              channel TEXT NOT NULL,
              channel_user_id TEXT NOT NULL,
              plane_user_id TEXT NOT NULL,
              issue_id TEXT NOT NULL,
              project_id TEXT,
              workspace_slug TEXT,
              delivery_id TEXT,
              channel_message_id TEXT,
              actor_plane_user_id TEXT,
              actor_name TEXT,
              legacy_context_id INTEGER,
              created_at TEXT NOT NULL,
              expires_at TEXT NOT NULL,
              last_used_at TEXT,
              UNIQUE(channel, legacy_context_id)
            );
            CREATE INDEX IF NOT EXISTS idx_message_contexts_channel_user_expiry
              ON message_contexts(channel, channel_user_id, expires_at);
            CREATE TABLE IF NOT EXISTS pending_replies (
              channel TEXT NOT NULL,
              channel_user_id TEXT NOT NULL,
              legacy_context_id INTEGER NOT NULL,
              created_at TEXT NOT NULL,
              expires_at TEXT NOT NULL,
              PRIMARY KEY(channel, channel_user_id)
            );
            CREATE TRIGGER IF NOT EXISTS sync_user_links_to_channels_insert
            AFTER INSERT ON user_links
            BEGIN
              INSERT INTO user_channels(
                plane_user_id, channel, channel_user_id, enabled, created_at, updated_at
              )
              VALUES (
                NEW.plane_user_id, 'vk', CAST(NEW.vk_user_id AS TEXT),
                CASE WHEN NEW.enabled = 1 AND NEW.vk_allowed = 1 THEN 1 ELSE 0 END,
                NEW.created_at, NEW.updated_at
              )
              ON CONFLICT(plane_user_id, channel) DO UPDATE SET
                channel_user_id = excluded.channel_user_id,
                enabled = excluded.enabled,
                updated_at = excluded.updated_at;
            END;
            CREATE TRIGGER IF NOT EXISTS sync_user_links_to_channels_update
            AFTER UPDATE OF vk_user_id, enabled, vk_allowed, updated_at ON user_links
            BEGIN
              INSERT INTO user_channels(
                plane_user_id, channel, channel_user_id, enabled, created_at, updated_at
              )
              VALUES (
                NEW.plane_user_id, 'vk', CAST(NEW.vk_user_id AS TEXT),
                CASE WHEN NEW.enabled = 1 AND NEW.vk_allowed = 1 THEN 1 ELSE 0 END,
                NEW.created_at, NEW.updated_at
              )
              ON CONFLICT(plane_user_id, channel) DO UPDATE SET
                channel_user_id = excluded.channel_user_id,
                enabled = excluded.enabled,
                updated_at = excluded.updated_at;
            END;
            CREATE TABLE IF NOT EXISTS link_events (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              vk_user_id INTEGER,
              plane_user_id TEXT,
              email TEXT,
              event TEXT NOT NULL,
              detail TEXT,
              created_at TEXT NOT NULL
            );
            """
        )
        columns = {row[1] for row in conn.execute("pragma table_info(user_links)")}
        if "email" not in columns:
            conn.execute("alter table user_links add column email TEXT")
        context_columns = {row[1] for row in conn.execute("pragma table_info(vk_message_contexts)")}
        if "actor_plane_user_id" not in context_columns:
            conn.execute("alter table vk_message_contexts add column actor_plane_user_id TEXT")
        if "actor_name" not in context_columns:
            conn.execute("alter table vk_message_contexts add column actor_name TEXT")
        # Additive backfill: legacy VK tables remain the read source until a
        # later migration explicitly switches it. Re-running this is safe.
        conn.execute(
            """
            INSERT OR IGNORE INTO user_channels(
              plane_user_id, channel, channel_user_id, enabled, created_at, updated_at
            )
            SELECT plane_user_id, ?, CAST(vk_user_id AS TEXT),
                   CASE WHEN enabled = 1 AND vk_allowed = 1 THEN 1 ELSE 0 END,
                   created_at, updated_at
            FROM user_links
            """,
            (CHANNEL_VK,),
        )
        conn.execute(
            """
            INSERT OR IGNORE INTO message_contexts(
              channel, channel_user_id, plane_user_id, issue_id, project_id,
              workspace_slug, delivery_id, channel_message_id,
              actor_plane_user_id, actor_name, legacy_context_id,
              created_at, expires_at, last_used_at
            )
            SELECT ?, CAST(vk_user_id AS TEXT), plane_user_id, issue_id, project_id,
                   workspace_slug, delivery_id, vk_message_id,
                   actor_plane_user_id, actor_name, id,
                   created_at, expires_at, last_used_at
            FROM vk_message_contexts
            """,
            (CHANNEL_VK,),
        )
        conn.execute(
            """
            INSERT OR IGNORE INTO pending_replies(
              channel, channel_user_id, legacy_context_id, created_at, expires_at
            )
            SELECT ?, CAST(vk_user_id AS TEXT), context_id, created_at, expires_at
            FROM pending_vk_replies
            """,
            (CHANNEL_VK,),
        )


init_sqlite()


@contextmanager
def sqlite_conn():
    conn = sqlite3.connect(settings.sqlite_path)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def record_channel_legacy_fallback(operation: str) -> None:
    CHANNEL_READ_FALLBACKS[operation] = CHANNEL_READ_FALLBACKS.get(operation, 0) + 1


def normalize_uuid(value: Any) -> str | None:
    if not value:
        return None
    try:
        return str(UUID(str(value)))
    except ValueError:
        return None


def normalize_email(value: Any) -> str | None:
    if not value:
        return None
    text = str(value).strip().lower()
    return text if "@" in text else None


def hash_confirm_code(code: str) -> str:
    return hashlib.sha256(code.strip().upper().encode("utf-8")).hexdigest()


def generate_confirm_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def user_help_message() -> str:
    return (
        "Привязка Plane к VK:\n"
        "1. Напишите /link ваша_почта@domain.ru\n"
        "2. Я отправлю код на эту почту\n"
        "3. Напишите /confirm 123456\n\n"
        "После уведомления по карточке доступны команды:\n"
        "/context - текущая карточка\n"
        "/open - ссылка на карточку\n"
        "/cancel - сбросить текущую карточку\n\n"
        "Чтобы ответить в Plane, напишите:\n"
        "/comment текст\n"
        "или: ответ текст\n\n"
        "Чтобы комментарии шли от вашего имени, добавьте Plane API token:\n"
        "/plane_token plane_api_...\n\n"
        "Используйте почту, с которой вы входите в Plane."
    )


def link_usage_message() -> str:
    return (
        "Чтобы привязать Plane к VK, отправьте команду с вашей почтой:\n"
        "/link ваша_почта@domain.ru\n\n"
        "Нужна именно почта из профиля Plane."
    )


def confirm_usage_message() -> str:
    return (
        "Чтобы подтвердить привязку, отправьте код из письма:\n"
        "/confirm 123456\n\n"
        "Можно отправить и просто шесть цифр без команды."
    )


def mask_email(email: str) -> str:
    if "@" not in email:
        return email
    left, right = email.split("@", 1)
    return f"{left[:2]}***@{right}" if len(left) > 2 else f"{left[:1]}***@{right}"


def bool_from_plane(value: Any, default: bool = False) -> bool:
    if value is None:
        return default
    return str(value).strip().lower() in {"1", "true", "yes", "on"}


def derive_plane_key(secret_key: str) -> bytes:
    dk = hashlib.pbkdf2_hmac("sha256", secret_key.encode(), b"salt", 100000)
    return base64.urlsafe_b64encode(dk)


def decrypt_plane_value(value: str) -> str:
    if not value:
        return ""
    if not settings.plane_secret_key:
        raise RuntimeError("SECRET_KEY or PLANE_SECRET_KEY is required to decrypt Plane SMTP password")
    return Fernet(derive_plane_key(settings.plane_secret_key)).decrypt(value.encode()).decode()


def get_plane_email_configuration() -> dict[str, Any]:
    rows = db_fetchall(
        """
        SELECT key, value, is_encrypted
        FROM instance_configurations
        WHERE deleted_at IS NULL
          AND category = 'SMTP'
          AND key IN (
            'ENABLE_SMTP',
            'EMAIL_HOST',
            'EMAIL_HOST_USER',
            'EMAIL_HOST_PASSWORD',
            'EMAIL_PORT',
            'EMAIL_USE_TLS',
            'EMAIL_USE_SSL',
            'EMAIL_FROM'
          )
        """,
        (),
    )
    values: dict[str, Any] = {}
    for row in rows:
        value = row["value"] or ""
        values[row["key"]] = decrypt_plane_value(value) if row["is_encrypted"] else value
    if not bool_from_plane(values.get("ENABLE_SMTP"), True):
        return {}
    return {
        "host": values.get("EMAIL_HOST", ""),
        "port": int(values.get("EMAIL_PORT") or 587),
        "username": values.get("EMAIL_HOST_USER", ""),
        "password": values.get("EMAIL_HOST_PASSWORD", ""),
        "from_email": values.get("EMAIL_FROM") or values.get("EMAIL_HOST_USER", ""),
        "use_tls": bool_from_plane(values.get("EMAIL_USE_TLS"), True),
        "use_ssl": bool_from_plane(values.get("EMAIL_USE_SSL"), False),
    }


def get_email_configuration() -> dict[str, Any]:
    if settings.smtp_host and settings.smtp_from:
        return {
            "host": settings.smtp_host,
            "port": settings.smtp_port,
            "username": settings.smtp_username,
            "password": settings.smtp_password,
            "from_email": settings.smtp_from,
            "use_tls": settings.smtp_use_tls,
            "use_ssl": settings.smtp_use_ssl,
        }
    return get_plane_email_configuration()


def smtp_is_configured() -> bool:
    config = get_email_configuration()
    return bool(config.get("host") and config.get("from_email"))


def render_confirm_email_html(email: str, code: str) -> str:
    escaped_email = html.escape(email)
    escaped_code = html.escape(code)
    return f"""<!DOCTYPE html>
<html lang="ru">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Код привязки VK к Plane</title></head>
<body style="font-family:Arial,Helvetica,sans-serif;color:#202124;line-height:1.5;background:#f7f7f8;padding:24px;"><div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:28px;">
<h1 style="font-size:22px;margin:0 0 16px;">Код привязки VK к Plane</h1>
<p>Код действует {settings.link_confirm_ttl_minutes} минут. Введите его в чате сообщества VK, чтобы завершить привязку аккаунта.</p>
<p style="font-size:28px;font-weight:700;letter-spacing:4px;margin:20px 0;">{escaped_code}</p>
<p style="color:#6b7280;font-size:13px;">Это письмо отправлено на {escaped_email}. Если вы не запрашивали привязку VK к Plane, просто проигнорируйте его.</p>
<p style="margin-top:28px;color:#6b7280;font-size:12px;">Plane</p></div></body>
</html>"""


def send_email(to_email: str, subject: str, body: str, html_body: str | None = None) -> None:
    config = get_email_configuration()
    if not config.get("host") or not config.get("from_email"):
        raise RuntimeError("SMTP is not configured")
    message = EmailMessage()
    message["From"] = config["from_email"]
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content(body)
    if html_body:
        message.add_alternative(html_body, subtype="html")
    smtp_cls = smtplib.SMTP_SSL if config["use_ssl"] else smtplib.SMTP
    with smtp_cls(config["host"], config["port"], timeout=20) as smtp:
        if config["use_tls"] and not config["use_ssl"]:
            smtp.starttls()
        if config.get("username"):
            smtp.login(config["username"], config.get("password", ""))
        smtp.send_message(message)


async def read_body(receive) -> bytes:
    chunks = []
    while True:
        message = await receive()
        if message["type"] != "http.request":
            continue
        chunks.append(message.get("body", b""))
        if not message.get("more_body"):
            return b"".join(chunks)


def header_dict(scope) -> dict[str, str]:
    return {k.decode("latin1").lower(): v.decode("latin1") for k, v in scope.get("headers", [])}


async def send_response(send, status: int, body: bytes, content_type: str = "application/json") -> None:
    await send(
        {
            "type": "http.response.start",
            "status": status,
            "headers": [(b"content-type", content_type.encode()), (b"content-length", str(len(body)).encode())],
        }
    )
    await send({"type": "http.response.body", "body": body})


async def json_response(send, status: int, data: Any) -> None:
    await send_response(send, status, json.dumps(data, ensure_ascii=False).encode("utf-8"))


def verify_admin(headers: dict[str, str]) -> bool:
    expected = f"Bearer {settings.admin_token}"
    return bool(settings.admin_token) and hmac.compare_digest(headers.get("authorization") or "", expected)


def verify_plane_signature(raw_body: bytes, payload: dict[str, Any], signature: str | None) -> tuple[bool, str | None]:
    if not settings.plane_webhook_secret:
        return True, None
    if not signature:
        return False, "Missing X-Plane-Signature"
    secrets = [secret.strip() for secret in settings.plane_webhook_secret.split(",") if secret.strip()]
    candidates = [
        raw_body,
        json.dumps(payload).encode("utf-8"),
        json.dumps(payload, separators=(",", ":")).encode("utf-8"),
    ]
    for secret in secrets:
        for candidate in candidates:
            digest = hmac.new(secret.encode("utf-8"), candidate, hashlib.sha256).hexdigest()
            if hmac.compare_digest(digest, signature):
                return True, None
    return False, "Invalid X-Plane-Signature"


def mark_delivery(delivery_id: str | None) -> bool:
    if not delivery_id:
        return True
    with sqlite_conn() as conn:
        try:
            conn.execute("INSERT INTO processed_events(delivery_id, created_at) VALUES (?, ?)", (delivery_id, now_iso()))
            return True
        except sqlite3.IntegrityError:
            return False


def vk_delivery_id(payload: dict[str, Any], message: dict[str, Any]) -> str | None:
    event_id = payload.get("event_id")
    if event_id:
        return f"vk:event:{event_id}"
    message_id = message.get("conversation_message_id") or message.get("id")
    sender_id = message.get("from_id")
    if message_id and sender_id:
        return f"vk:message:{sender_id}:{message_id}"
    return None


def db_fetchone(query: str, params: tuple[Any, ...]) -> dict[str, Any] | None:
    with psycopg.connect(settings.plane_database_url) as conn:
        with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
            cur.execute(query, params)
            row = cur.fetchone()
            return dict(row) if row else None


def db_fetchall(query: str, params: tuple[Any, ...]) -> list[dict[str, Any]]:
    with psycopg.connect(settings.plane_database_url) as conn:
        with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
            cur.execute(query, params)
            return [dict(row) for row in cur.fetchall()]


def get_issue_id(payload: dict[str, Any]) -> str | None:
    data = payload.get("data") or {}
    if payload.get("event") == "issue":
        return normalize_uuid(data.get("id"))
    if payload.get("event") == "issue_comment":
        return normalize_uuid(data.get("issue") or data.get("issue_id"))
    return None


def get_issue(issue_id: str) -> dict[str, Any] | None:
    return db_fetchone(
        """
        SELECT i.id::text, i.name, i.sequence_id, i.project_id::text,
               p.identifier AS project_identifier, p.name AS project_name,
               w.slug AS workspace_slug
        FROM issues i
        JOIN projects p ON p.id = i.project_id
        JOIN workspaces w ON w.id = i.workspace_id
        WHERE i.id = %s AND i.deleted_at IS NULL
        """,
        (issue_id,),
    )


def get_plane_user_by_id(plane_user_id: str) -> dict[str, Any] | None:
    return db_fetchone(
        """
        SELECT id::text AS id, email, display_name
        FROM users
        WHERE id = %s
          AND is_active = TRUE
        """,
        (plane_user_id,),
    )


def get_plane_user_by_email(email: str) -> dict[str, Any] | None:
    return db_fetchone(
        """
        SELECT id::text AS id, email, display_name
        FROM users
        WHERE lower(email) = lower(%s)
          AND is_active = TRUE
        LIMIT 1
        """,
        (email,),
    )


def get_plane_users_by_ids(user_ids: list[str]) -> dict[str, dict[str, Any]]:
    normalized_ids = [user_id for user_id in (normalize_uuid(value) for value in user_ids) if user_id]
    if not normalized_ids:
        return {}
    return {
        row["id"]: row
        for row in db_fetchall(
            """
            SELECT id::text AS id, email, display_name
            FROM users
            WHERE id = ANY(%s::uuid[])
            """,
            (normalized_ids,),
        )
    }


def get_state_names_by_ids(state_ids: list[str]) -> dict[str, str]:
    normalized_ids = [state_id for state_id in (normalize_uuid(value) for value in state_ids) if state_id]
    if not normalized_ids:
        return {}
    return {
        row["id"]: row["name"]
        for row in db_fetchall(
            """
            SELECT id::text AS id, name
            FROM states
            WHERE id = ANY(%s::uuid[])
            """,
            (normalized_ids,),
        )
    }


def get_link_by_vk_user_id(vk_user_id: int) -> dict[str, Any] | None:
    with sqlite_conn() as conn:
        row = conn.execute(
            """
            SELECT ul.plane_user_id, CAST(uc.channel_user_id AS INTEGER) AS vk_user_id,
                   ul.email, ul.display_name, ul.enabled, ul.vk_allowed
            FROM user_channels uc
            JOIN user_links ul ON ul.plane_user_id = uc.plane_user_id
            WHERE uc.channel = ? AND uc.channel_user_id = ?
            LIMIT 1
            """,
            (CHANNEL_VK, str(vk_user_id)),
        ).fetchone()
        if row:
            return dict(row)
        record_channel_legacy_fallback("user_by_channel_user")
        row = conn.execute(
            """
            SELECT plane_user_id, vk_user_id, email, display_name, enabled, vk_allowed
            FROM user_links
            WHERE vk_user_id = ?
            LIMIT 1
            """,
            (int(vk_user_id),),
        ).fetchone()
        return dict(row) if row else None


def get_assignees(issue_id: str) -> list[dict[str, Any]]:
    return db_fetchall(
        """
        SELECT u.id::text AS plane_user_id, u.email, u.display_name
        FROM issue_assignees ia
        JOIN users u ON u.id = ia.assignee_id
        WHERE ia.issue_id = %s
          AND ia.deleted_at IS NULL
          AND u.is_active = TRUE
        ORDER BY u.display_name, u.email
        """,
        (issue_id,),
    )


def get_actor(payload: dict[str, Any]) -> dict[str, Any]:
    actor = ((payload.get("activity") or {}).get("actor") or {})
    return {"id": normalize_uuid(actor.get("id")), "name": actor.get("display_name") or actor.get("email") or "Someone"}


def get_linked_vk_users(plane_user_ids: list[str], emails: list[str]) -> tuple[dict[str, dict[str, Any]], dict[str, dict[str, Any]]]:
    links_by_id: dict[str, dict[str, Any]] = {}
    links_by_email: dict[str, dict[str, Any]] = {}
    with sqlite_conn() as conn:
        if plane_user_ids:
            placeholders = ",".join(["?"] * len(plane_user_ids))
            rows = conn.execute(
                f"""
                SELECT ul.plane_user_id, CAST(uc.channel_user_id AS INTEGER) AS vk_user_id,
                       ul.email, ul.display_name
                FROM user_channels uc
                JOIN user_links ul ON ul.plane_user_id = uc.plane_user_id
                WHERE uc.channel = ? AND uc.enabled = 1
                  AND ul.enabled = 1 AND ul.vk_allowed = 1
                  AND uc.plane_user_id IN ({placeholders})
                """,
                [CHANNEL_VK, *plane_user_ids],
            ).fetchall()
            if not rows:
                record_channel_legacy_fallback("users_by_plane_id")
                rows = conn.execute(
                    f"""
                    SELECT plane_user_id, vk_user_id, email, display_name
                    FROM user_links
                    WHERE enabled = 1 AND vk_allowed = 1 AND plane_user_id IN ({placeholders})
                    """,
                    plane_user_ids,
                ).fetchall()
            links_by_id = {row["plane_user_id"]: dict(row) for row in rows}
        if emails:
            normalized_emails = [email for email in (normalize_email(email) for email in emails) if email]
            if normalized_emails:
                placeholders = ",".join(["?"] * len(normalized_emails))
                rows = conn.execute(
                    f"""
                    SELECT ul.plane_user_id, CAST(uc.channel_user_id AS INTEGER) AS vk_user_id,
                           ul.email, ul.display_name
                    FROM user_channels uc
                    JOIN user_links ul ON ul.plane_user_id = uc.plane_user_id
                    WHERE uc.channel = ? AND uc.enabled = 1
                      AND ul.enabled = 1 AND ul.vk_allowed = 1
                      AND lower(ul.email) IN ({placeholders})
                    """,
                    [CHANNEL_VK, *normalized_emails],
                ).fetchall()
                if not rows:
                    record_channel_legacy_fallback("users_by_email")
                    rows = conn.execute(
                        f"""
                        SELECT plane_user_id, vk_user_id, email, display_name
                        FROM user_links
                        WHERE enabled = 1 AND vk_allowed = 1 AND lower(email) IN ({placeholders})
                        """,
                        normalized_emails,
                    ).fetchall()
                links_by_email = {row["email"].lower(): dict(row) for row in rows if row["email"]}
    return links_by_id, links_by_email


def compact(value: Any, limit: int = 500) -> str:
    if value is None:
        return ""
    text = " ".join(str(value).split())
    return text if len(text) <= limit else text[: limit - 1] + "..."


def issue_url(issue: dict[str, Any]) -> str:
    base = settings.plane_web_url.rstrip("/")
    return f"{base}/{issue['workspace_slug']}/projects/{issue['project_id']}/issues/{issue['id']}"


def plane_api_url(path: str) -> str:
    return settings.plane_api_base_url.rstrip("/") + path


FIELD_LABELS = {
    "assignee_ids": "ответственных",
    "assignees": "ответственных",
    "name": "название",
    "description": "описание",
    "description_html": "описание",
    "state_id": "статус",
    "state": "статус",
    "priority": "приоритет",
    "target_date": "срок выполнения",
    "start_date": "время начала",
    "module_ids": "модули",
    "modules": "модули",
    "cycle_id": "цикл",
    "cycles": "цикл",
    "label_ids": "метки",
    "labels": "метки",
    "estimate_point": "оценку",
    "comment": "комментарий",
    "issue": "карточку",
    "parent": "родительскую карточку",
    "link": "ссылку",
    "attachment": "вложение",
    "created_at": "время создания",
    "updated_at": "время изменения",
    "completed_at": "время завершения",
    "archived_at": "время архивации",
    "sequence_id": "номер",
    "sort_order": "порядок",
    "estimate_point_id": "оценку",
    "project_id": "проект",
    "workspace_id": "рабочее пространство",
    "created_by": "автора",
    "updated_by": "автора изменения",
    "completed_by": "завершившего",
    "archived_by": "архивировавшего",
    "is_draft": "черновик",
    "is_subscribed": "подписку",
    "deleted_at": "удаление",
}


SKIP_NOTIFICATION_FIELDS = {
    "sort_order",
}


PRIORITY_LABELS = {
    "urgent": "срочный",
    "high": "высокий",
    "medium": "средний",
    "low": "низкий",
    "none": "нет",
    "": "нет",
}


EMPTY_VALUES = {"", "none", "null", "[]", "{}", "нет", "None"}


def field_label(field: Any) -> str:
    return FIELD_LABELS.get(str(field or ""), str(field or "карточку"))


def parse_list_value(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(item) for item in value if item]
    if isinstance(value, tuple):
        return [str(item) for item in value if item]
    if isinstance(value, str):
        text = value.strip()
        if not text or text == "[]":
            return []
        try:
            parsed = ast.literal_eval(text)
        except (SyntaxError, ValueError):
            return [text]
        if isinstance(parsed, (list, tuple, set)):
            return [str(item) for item in parsed if item]
        return [str(parsed)] if parsed else []
    return [str(value)]


def display_user_names(user_ids: list[str]) -> list[str]:
    users = get_plane_users_by_ids(user_ids)
    names: list[str] = []
    for user_id in user_ids:
        normalized_id = normalize_uuid(user_id)
        user = users.get(normalized_id or "")
        names.append((user or {}).get("display_name") or (user or {}).get("email") or compact(user_id, 12))
    return names


def joined_names(names: list[str]) -> str:
    return ", ".join(name for name in names if name) or "нет"


def html_to_text(value: str) -> str:
    text = re.sub(r"<[^>]+>", " ", value)
    return html.unescape(" ".join(text.split()))


def mention_ids_from_html(value: Any) -> list[str]:
    if not value:
        return []
    ids = re.findall(r'entity_identifier="([^"]+)"', str(value))
    seen: set[str] = set()
    result: list[str] = []
    for raw_id in ids:
        normalized_id = normalize_uuid(raw_id)
        if normalized_id and normalized_id not in seen:
            seen.add(normalized_id)
            result.append(normalized_id)
    return result


def comment_text_from_html(value: Any) -> str:
    if not value:
        return ""
    text = str(value)
    mentioned_users = get_plane_users_by_ids(mention_ids_from_html(text))

    def replace_mention(match: re.Match) -> str:
        attrs = match.group(0)
        raw_id = re.search(r'entity_identifier="([^"]+)"', attrs)
        normalized_id = normalize_uuid(raw_id.group(1)) if raw_id else None
        user = mentioned_users.get(normalized_id or "")
        name = (user or {}).get("display_name") or (user or {}).get("email") or ""
        return f" @{name} " if name else " "

    text = re.sub(r"<mention-component\b[^>]*></mention-component>", replace_mention, text)
    text = re.sub(r"</(p|div|h[1-6]|li|tr)>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", " ", text)
    lines = [" ".join(html.unescape(line).split()) for line in text.splitlines()]
    return "\n".join(line for line in lines if line).strip()


def comment_text_from_payload(payload: dict[str, Any]) -> str:
    data = payload.get("data") or {}
    activity = payload.get("activity") or {}
    candidates = [
        data.get("comment_stripped"),
        data.get("comment_html"),
        data.get("comment"),
        data.get("description_html"),
        activity.get("new_value"),
    ]
    for value in candidates:
        text = comment_text_from_html(value)
        if text:
            return text
    return ""


def mentioned_user_ids_from_payload(payload: dict[str, Any]) -> list[str]:
    data = payload.get("data") or {}
    activity = payload.get("activity") or {}
    ids: list[str] = []
    for value in [
        data.get("comment_html"),
        data.get("comment"),
        data.get("description_html"),
        activity.get("new_value"),
    ]:
        ids.extend(mention_ids_from_html(value))
    seen: set[str] = set()
    result: list[str] = []
    for user_id in ids:
        if user_id not in seen:
            seen.add(user_id)
            result.append(user_id)
    return result


def is_comment_payload(payload: dict[str, Any]) -> bool:
    return payload.get("event") == "issue_comment" or (payload.get("activity") or {}).get("field") == "comment"


def display_value(field: Any, value: Any, limit: int = 180) -> str:
    if value is None:
        return ""
    text = str(value).strip()
    if text in EMPTY_VALUES or text.lower() in EMPTY_VALUES:
        return ""
    if str(field) == "priority":
        return PRIORITY_LABELS.get(text.lower(), text)
    if str(field) in {"state", "state_id"}:
        normalized_id = normalize_uuid(text)
        if normalized_id:
            return get_state_names_by_ids([normalized_id]).get(normalized_id, text)
    if "<" in text and ">" in text:
        text = html_to_text(text)
    return compact(text, limit)


def render_assignee_change(actor_name: str, old_value: Any, new_value: Any) -> str:
    old_ids = parse_list_value(old_value)
    new_ids = parse_list_value(new_value)
    old_set = set(old_ids)
    new_set = set(new_ids)
    added = [user_id for user_id in new_ids if user_id not in old_set]
    removed = [user_id for user_id in old_ids if user_id not in new_set]
    if added and not removed:
        return f"{actor_name} добавил ответственного: {joined_names(display_user_names(added))}."
    if removed and not added:
        return f"{actor_name} удалил ответственного: {joined_names(display_user_names(removed))}."
    if added or removed:
        parts = []
        if added:
            parts.append(f"добавил: {joined_names(display_user_names(added))}")
        if removed:
            parts.append(f"удалил: {joined_names(display_user_names(removed))}")
        return f"{actor_name} изменил ответственных: {'; '.join(parts)}."
    return f"{actor_name} обновил список ответственных."


def render_field_change(actor_name: str, field: Any, old_value: Any, new_value: Any) -> str:
    if field in {"assignee_ids", "assignees"}:
        return render_assignee_change(actor_name, old_value, new_value)
    if field == "comment":
        return f"{actor_name} оставил комментарий."
    if field in {"description", "description_html"}:
        return f"{actor_name} изменил описание."
    if field == "attachment":
        return f"{actor_name} обновил вложения."
    if field == "link":
        return f"{actor_name} обновил ссылки."
    label = field_label(field)
    old_text = display_value(field, old_value, 120)
    new_text = display_value(field, new_value, 180)
    if new_text and not old_text:
        return f"{actor_name} установил {label}: {new_text}."
    if old_text and not new_text:
        return f"{actor_name} очистил {label}."
    if new_text and old_text and old_text != new_text:
        return f"{actor_name} изменил {label}: {old_text} -> {new_text}."
    return f"{actor_name} изменил {label}."


def format_message(payload: dict[str, Any], issue: dict[str, Any], include_url: bool = True) -> str:
    activity = payload.get("activity") or {}
    actor = get_actor(payload)
    event = payload.get("event")
    action = payload.get("action")
    field = activity.get("field")
    old_value = activity.get("old_value")
    new_value = activity.get("new_value")
    identifier = f"{issue['project_identifier']}-{issue['sequence_id']}"
    lines = [f"{identifier} {issue['name']}", ""]
    if is_comment_payload(payload):
        comment = compact(comment_text_from_payload(payload), 900)
        lines.append(f"{actor['name']} оставил комментарий:")
        if comment:
            lines.append(comment)
    elif action == "created":
        lines.append(f"{actor['name']} создал карточку.")
    elif field:
        lines.append(render_field_change(actor["name"], field, old_value, new_value))
    else:
        lines.append(f"{actor['name']} обновил карточку.")
    if include_url:
        lines.extend(["", issue_url(issue)])
    return "\n".join(lines)[:1800]


def vk_message_id_from_response(response_value: Any) -> str | None:
    if isinstance(response_value, int):
        return str(response_value)
    if isinstance(response_value, str):
        return response_value
    if isinstance(response_value, dict):
        for key in ("conversation_message_id", "message_id", "id"):
            if response_value.get(key):
                return str(response_value[key])
    if isinstance(response_value, list) and response_value:
        return vk_message_id_from_response(response_value[0])
    return None


async def send_vk_message_result(
    vk_user_id: int,
    message: str,
    delivery_id: str | None,
    keyboard: dict[str, Any] | None = None,
) -> tuple[bool, str | None, str | None]:
    if not settings.vk_group_token:
        return False, "VK_GROUP_TOKEN is not configured", None
    random_id_src = f"{delivery_id or time.time_ns()}:{vk_user_id}"
    random_id = int(hashlib.blake2s(random_id_src.encode(), digest_size=16).hexdigest()[:8], 16)
    data = {
        "peer_id": vk_user_id,
        "message": message,
        "random_id": random_id,
        "access_token": settings.vk_group_token,
        "v": settings.vk_api_version,
        "disable_mentions": 1,
    }
    if keyboard:
        data["keyboard"] = json.dumps(keyboard, ensure_ascii=False)
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.post(settings.vk_api_endpoint, data=data)
            body = response.json()
    except Exception as exc:
        logger.exception("failed to call VK messages.send for vk_user_id=%s", vk_user_id)
        return False, str(exc), None
    if "response" in body:
        return True, None, vk_message_id_from_response(body.get("response"))
    error = body.get("error") or {}
    error_msg = f"{error.get('error_code')}: {error.get('error_msg')}"
    if error.get("error_code") in {900, 901, 902, 914, 936, 939}:
        with sqlite_conn() as conn:
            conn.execute(
                "UPDATE user_links SET vk_allowed = 0, last_error = ?, updated_at = ? WHERE vk_user_id = ?",
                (error_msg, now_iso(), vk_user_id),
            )
    return False, error_msg, None


async def send_vk_message(vk_user_id: int, message: str, delivery_id: str | None) -> tuple[bool, str | None]:
    ok, error, _ = await send_vk_message_result(vk_user_id, message, delivery_id)
    return ok, error


async def send_vk_message_with_keyboard(
    vk_user_id: int,
    message: str,
    delivery_id: str | None,
    keyboard: dict[str, Any] | None = None,
) -> tuple[bool, str | None]:
    ok, error, _ = await send_vk_message_result(vk_user_id, message, delivery_id, keyboard)
    return ok, error


async def send_channel_message_result(
    channel: str,
    recipient_id: int,
    message: str,
    delivery_id: str | None,
    keyboard: dict[str, Any] | None = None,
) -> tuple[bool, str | None, str | None]:
    """Send a message through a channel adapter and preserve its delivery result."""
    if channel != CHANNEL_VK:
        return False, f"Unsupported notification channel: {channel}", None
    return await send_vk_message_result(recipient_id, message, delivery_id, keyboard)


async def send_channel_message(
    channel: str,
    recipient_id: int,
    message: str,
    delivery_id: str | None,
    keyboard: dict[str, Any] | None = None,
) -> tuple[bool, str | None]:
    """Channel-neutral convenience wrapper for sends that do not need a message id."""
    ok, error, _ = await send_channel_message_result(channel, recipient_id, message, delivery_id, keyboard)
    return ok, error


def issue_keyboard(issue: dict[str, Any], context_id: int | None = None) -> dict[str, Any]:
    payload_base = {"channel": CHANNEL_VK, "issue_id": issue["id"], "context_id": context_id}
    return {
        "inline": True,
        "buttons": [
            [
                {
                    "action": {
                        "type": "open_link",
                        "link": issue_url(issue),
                        "label": "Открыть",
                        "payload": json.dumps({**payload_base, "action": "open"}, ensure_ascii=False),
                    }
                },
                {
                    "action": {
                        "type": "text",
                        "label": "Ответить",
                        "payload": json.dumps({**payload_base, "action": "reply_help"}, ensure_ascii=False),
                    },
                    "color": "primary",
                },
            ]
        ],
    }


def mention_component_html(user_id: str, name: str | None) -> str:
    safe_id = html.escape(str(user_id), quote=True)
    safe_name = html.escape(name or "пользователь Plane", quote=True)
    visible_name = html.escape(name or "пользователь Plane")
    return (
        f'<mention-component entity_identifier="{safe_id}" entity_name="{safe_name}">'
        f"@{visible_name}</mention-component>"
    )


def comment_html_from_vk_text(text: str, mention_user: dict[str, str] | None = None) -> str:
    paragraphs = [html.escape(part.strip()) for part in re.split(r"\n{2,}", text.strip()) if part.strip()]
    if not paragraphs:
        return "<p></p>"
    body = "".join(f"<p>{part.replace(chr(10), '<br>')}</p>" for part in paragraphs)
    if not mention_user:
        return body
    return f"<p>{mention_component_html(mention_user['id'], mention_user.get('name'))}</p>{body}"


def token_encryption_secret() -> str:
    return settings.notifier_token_encryption_key or settings.plane_secret_key


def get_token_fernet() -> Fernet | None:
    secret = token_encryption_secret()
    if not secret:
        return None
    if secret.startswith("gAAAA") or len(secret) == 44:
        try:
            return Fernet(secret.encode("utf-8"))
        except Exception:
            pass
    return Fernet(derive_plane_key(secret))


def encrypt_user_api_token(token: str) -> str | None:
    fernet = get_token_fernet()
    if not fernet:
        return None
    return fernet.encrypt(token.encode("utf-8")).decode("utf-8")


def decrypt_user_api_token(token_encrypted: str) -> str:
    fernet = get_token_fernet()
    if not fernet:
        raise RuntimeError("NOTIFIER_TOKEN_ENCRYPTION_KEY or SECRET_KEY is required to decrypt user API tokens")
    return fernet.decrypt(token_encrypted.encode("utf-8")).decode("utf-8")


def token_hash(token: str) -> str:
    # This is an opaque identifier for diagnostics and idempotency, not a
    # password verifier. Keying prevents offline fingerprint correlation if the
    # SQLite database is exposed.
    secret = token_encryption_secret()
    if not secret:
        raise RuntimeError("NOTIFIER_TOKEN_ENCRYPTION_KEY or SECRET_KEY is required to fingerprint user API tokens")
    key = hashlib.blake2b(secret.encode("utf-8"), digest_size=32).digest()
    return hashlib.blake2b(token.encode("utf-8"), key=key, digest_size=32).hexdigest()


def get_user_api_token_row(vk_user_id: int) -> dict[str, Any] | None:
    with sqlite_conn() as conn:
        row = conn.execute(
            """
            SELECT plane_user_id, vk_user_id, token_encrypted, token_hash, enabled, last_error, created_at, updated_at, last_used_at
            FROM user_api_tokens
            WHERE vk_user_id = ? AND enabled = 1
            LIMIT 1
            """,
            (int(vk_user_id),),
        ).fetchone()
        return dict(row) if row else None


def get_user_api_token(vk_user_id: int) -> str | None:
    row = get_user_api_token_row(vk_user_id)
    if not row:
        return None
    try:
        return decrypt_user_api_token(row["token_encrypted"])
    except Exception:
        logger.exception("failed to decrypt user API token for vk_user_id=%s", vk_user_id)
        return None


def generate_plane_api_token() -> str:
    return "plane_api_" + secrets.token_urlsafe(24)[:32]


def get_plane_api_token_for_user(plane_user_id: str, label: str = VK_RESPONSE_TOKEN_LABEL) -> str | None:
    row = db_fetchone(
        """
        SELECT token
        FROM api_tokens
        WHERE user_id = %s
          AND label = %s
          AND is_active = TRUE
          AND deleted_at IS NULL
          AND (expired_at IS NULL OR expired_at > NOW())
        ORDER BY created_at DESC
        LIMIT 1
        """,
        (plane_user_id, label),
    )
    return row["token"] if row else None


def create_plane_api_token_for_user(plane_user_id: str, label: str = VK_RESPONSE_TOKEN_LABEL) -> str:
    existing = get_plane_api_token_for_user(plane_user_id, label)
    if existing:
        return existing
    now = datetime.now(timezone.utc)
    for _ in range(3):
        token = generate_plane_api_token()
        try:
            with psycopg.connect(settings.plane_database_url) as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO api_tokens(
                          created_at, updated_at, id, token, label, user_type,
                          created_by_id, updated_by_id, user_id, workspace_id,
                          description, expired_at, is_active, last_used, is_service,
                          deleted_at, allowed_rate_limit
                        )
                        VALUES (
                          %s, %s, %s, %s, %s, 0,
                          %s, %s, %s, NULL,
                          %s, NULL, TRUE, NULL, FALSE,
                          NULL, '60/min'
                        )
                        """,
                        (
                            now,
                            now,
                            uuid4(),
                            token,
                            label,
                            plane_user_id,
                            plane_user_id,
                            plane_user_id,
                            VK_RESPONSE_TOKEN_DESCRIPTION,
                        ),
                    )
            return token
        except psycopg.errors.UniqueViolation:
            continue
    raise RuntimeError("failed to generate unique Plane API token")


def ensure_vk_response_token(vk_user_id: int, plane_user_id: str) -> tuple[bool, str]:
    if get_user_api_token_row(vk_user_id):
        return True, "already_saved"
    if not get_token_fernet():
        return False, "no_encryption"
    token = create_plane_api_token_for_user(plane_user_id)
    if not save_user_api_token(vk_user_id, plane_user_id, token):
        return False, "save_failed"
    return True, "created"


def validate_plane_api_token_owner(token: str, plane_user_id: str) -> tuple[bool, str | None]:
    row = db_fetchone(
        """
        SELECT id::text, user_id::text, is_active, expired_at
        FROM api_tokens
        WHERE token = %s
        LIMIT 1
        """,
        (token,),
    )
    if not row:
        return False, "not_found"
    if not row.get("is_active"):
        return False, "inactive"
    expired_at = row.get("expired_at")
    if expired_at:
        if expired_at.tzinfo is None:
            expired_at = expired_at.replace(tzinfo=timezone.utc)
        if expired_at < datetime.now(timezone.utc):
            return False, "expired"
    if str(row.get("user_id")) != str(plane_user_id):
        return False, "owner_mismatch"
    return True, None


def save_user_api_token(vk_user_id: int, plane_user_id: str, token: str) -> bool:
    encrypted = encrypt_user_api_token(token)
    if not encrypted:
        return False
    ts = now_iso()
    with sqlite_conn() as conn:
        conn.execute(
            """
            INSERT INTO user_api_tokens(plane_user_id, vk_user_id, token_encrypted, token_hash, enabled, created_at, updated_at)
            VALUES (?, ?, ?, ?, 1, ?, ?)
            ON CONFLICT(plane_user_id) DO UPDATE SET
              vk_user_id = excluded.vk_user_id,
              token_encrypted = excluded.token_encrypted,
              token_hash = excluded.token_hash,
              enabled = 1,
              last_error = NULL,
              updated_at = excluded.updated_at
            """,
            (plane_user_id, int(vk_user_id), encrypted, token_hash(token), ts, ts),
        )
    return True


def delete_user_api_token(vk_user_id: int) -> int:
    with sqlite_conn() as conn:
        cursor = conn.execute(
            "UPDATE user_api_tokens SET enabled = 0, updated_at = ? WHERE vk_user_id = ? AND enabled = 1",
            (now_iso(), int(vk_user_id)),
        )
        return cursor.rowcount


def mark_user_api_token_used(vk_user_id: int) -> None:
    with sqlite_conn() as conn:
        conn.execute("UPDATE user_api_tokens SET last_used_at = ?, last_error = NULL WHERE vk_user_id = ?", (now_iso(), int(vk_user_id)))


def mark_user_api_token_error(vk_user_id: int, error: str) -> None:
    with sqlite_conn() as conn:
        conn.execute(
            "UPDATE user_api_tokens SET last_error = ?, updated_at = ? WHERE vk_user_id = ?",
            (compact(error, 240), now_iso(), int(vk_user_id)),
        )


def fallback_comment_text(link: dict[str, Any], comment_text: str) -> str:
    author = link.get("display_name") or link.get("email") or "пользователя Plane"
    return f"Ответ из VK от {author}:\n\n{comment_text}"


async def create_plane_comment_from_vk(
    context: dict[str, Any],
    comment_text: str,
    api_token: str | None = None,
    mention_user: dict[str, str] | None = None,
) -> tuple[bool, str | None]:
    token = api_token or settings.plane_api_token
    if not token:
        return False, "PLANE_API_TOKEN is not configured"
    issue = get_issue(context["issue_id"])
    if not issue:
        return False, "issue_not_found"
    external_id_src = f"vk:{context['vk_user_id']}:{context['id']}:{comment_text}"
    external_id = hashlib.sha256(external_id_src.encode("utf-8")).hexdigest()
    url = plane_api_url(
        f"/api/v1/workspaces/{issue['workspace_slug']}/projects/{issue['project_id']}/issues/{issue['id']}/comments/"
    )
    payload = {
        "comment_html": comment_html_from_vk_text(comment_text, mention_user),
        "created_by": context["plane_user_id"],
        "external_source": "vk",
        "external_id": external_id,
    }
    headers = {"X-Api-Key": token, "Content-Type": "application/json"}
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(url, headers=headers, json=payload)
    except Exception as exc:
        logger.exception("failed to create Plane comment from VK")
        return False, str(exc)
    if response.status_code in {200, 201}:
        return True, None
    if response.status_code == 409:
        return True, None
    logger.error("Plane comment create failed status=%s body=%s", response.status_code, compact(response.text, 500))
    return False, f"plane_api_status={response.status_code}"


def upsert_user_link(plane_user: dict[str, Any], vk_user_id: int, email: str | None = None) -> None:
    ts = now_iso()
    link_email = normalize_email(email) or normalize_email(plane_user.get("email"))
    with sqlite_conn() as conn:
        conn.execute(
            """
            INSERT INTO user_links(plane_user_id, vk_user_id, email, display_name, enabled, vk_allowed, created_at, updated_at)
            VALUES (?, ?, ?, ?, 1, 1, ?, ?)
            ON CONFLICT(plane_user_id) DO UPDATE SET
              vk_user_id = excluded.vk_user_id,
              email = COALESCE(excluded.email, user_links.email),
              display_name = COALESCE(excluded.display_name, user_links.display_name),
              enabled = 1,
              vk_allowed = 1,
              updated_at = excluded.updated_at
            """,
            (plane_user["id"], int(vk_user_id), link_email, plane_user.get("display_name"), ts, ts),
        )


def log_delivery(delivery_id, plane_user_id, vk_user_id, issue_id, status, error=None) -> None:
    with sqlite_conn() as conn:
        conn.execute(
            """
            INSERT INTO delivery_log(delivery_id, plane_user_id, vk_user_id, issue_id, status, error, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (delivery_id, plane_user_id, vk_user_id, issue_id, status, error, now_iso()),
        )


def log_link_event(vk_user_id: int | None, event: str, plane_user_id: str | None = None, email: str | None = None, detail: str | None = None) -> None:
    with sqlite_conn() as conn:
        conn.execute(
            """
            INSERT INTO link_events(vk_user_id, plane_user_id, email, event, detail, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (vk_user_id, plane_user_id, email, event, detail, now_iso()),
        )


def save_vk_message_context(
    vk_user_id: int,
    plane_user_id: str,
    issue: dict[str, Any],
    delivery_id: str | None,
    vk_message_id: str | None = None,
    actor: dict[str, Any] | None = None,
) -> int:
    created_at = datetime.now(timezone.utc)
    expires_at = created_at + timedelta(hours=settings.vk_context_ttl_hours)
    with sqlite_conn() as conn:
        cursor = conn.execute(
            """
            INSERT INTO vk_message_contexts(
              vk_user_id, plane_user_id, issue_id, project_id, workspace_slug,
              delivery_id, vk_message_id, actor_plane_user_id, actor_name,
              created_at, expires_at, last_used_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                int(vk_user_id),
                plane_user_id,
                issue["id"],
                issue.get("project_id"),
                issue.get("workspace_slug"),
                delivery_id,
                vk_message_id,
                normalize_uuid((actor or {}).get("id")),
                (actor or {}).get("name"),
                created_at.isoformat(),
                expires_at.isoformat(),
                created_at.isoformat(),
            ),
        )
        legacy_context_id = int(cursor.lastrowid)
        conn.execute(
            """
            INSERT INTO message_contexts(
              channel, channel_user_id, plane_user_id, issue_id, project_id,
              workspace_slug, delivery_id, channel_message_id,
              actor_plane_user_id, actor_name, legacy_context_id,
              created_at, expires_at, last_used_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(channel, legacy_context_id) DO UPDATE SET
              channel_message_id = excluded.channel_message_id,
              expires_at = excluded.expires_at,
              last_used_at = excluded.last_used_at
            """,
            (
                CHANNEL_VK, str(vk_user_id), plane_user_id, issue["id"],
                issue.get("project_id"), issue.get("workspace_slug"), delivery_id,
                vk_message_id, normalize_uuid((actor or {}).get("id")),
                (actor or {}).get("name"), legacy_context_id,
                created_at.isoformat(), expires_at.isoformat(), created_at.isoformat(),
            ),
        )
        return legacy_context_id


def get_channel_message_context(
    channel: str,
    channel_user_id: int | str,
    *,
    legacy_context_id: Any = None,
    channel_message_id: str | None = None,
    issue_id: str | None = None,
) -> dict[str, Any] | None:
    """Read the universal context first and present the legacy VK shape to callers."""
    conditions = ["channel = ?", "channel_user_id = ?", "expires_at > ?", "legacy_context_id IS NOT NULL"]
    params: list[Any] = [channel, str(channel_user_id), now_iso()]
    if legacy_context_id is not None:
        conditions.append("legacy_context_id = ?")
        params.append(legacy_context_id)
    elif channel_message_id is not None:
        conditions.append("channel_message_id = ?")
        params.append(channel_message_id)
    elif issue_id is not None:
        conditions.append("issue_id = ?")
        params.append(issue_id)
    order_by = "COALESCE(last_used_at, created_at) DESC, id DESC" if legacy_context_id is None else "id DESC"
    with sqlite_conn() as conn:
        row = conn.execute(
            f"""
            SELECT id, channel, channel_user_id, plane_user_id, issue_id, project_id,
                   workspace_slug, delivery_id, channel_message_id,
                   actor_plane_user_id, actor_name, legacy_context_id,
                   created_at, expires_at, last_used_at
            FROM message_contexts
            WHERE {' AND '.join(conditions)}
            ORDER BY {order_by}
            LIMIT 1
            """,
            params,
        ).fetchone()
        if not row:
            return None
        used_at = now_iso()
        conn.execute("UPDATE message_contexts SET last_used_at = ? WHERE id = ?", (used_at, row["id"]))
        if channel == CHANNEL_VK:
            conn.execute("UPDATE vk_message_contexts SET last_used_at = ? WHERE id = ?", (used_at, row["legacy_context_id"]))
        return {
            "id": row["legacy_context_id"],
            "vk_user_id": int(row["channel_user_id"]) if channel == CHANNEL_VK else row["channel_user_id"],
            "plane_user_id": row["plane_user_id"],
            "issue_id": row["issue_id"],
            "project_id": row["project_id"],
            "workspace_slug": row["workspace_slug"],
            "delivery_id": row["delivery_id"],
            "vk_message_id": row["channel_message_id"],
            "actor_plane_user_id": row["actor_plane_user_id"],
            "actor_name": row["actor_name"],
            "created_at": row["created_at"],
            "expires_at": row["expires_at"],
            "last_used_at": used_at,
        }


def get_latest_vk_message_context(vk_user_id: int) -> dict[str, Any] | None:
    context = get_channel_message_context(CHANNEL_VK, vk_user_id)
    if context:
        return context
    record_channel_legacy_fallback("latest_context")
    with sqlite_conn() as conn:
        row = conn.execute(
            """
            SELECT id, vk_user_id, plane_user_id, issue_id, project_id, workspace_slug,
                   delivery_id, vk_message_id, actor_plane_user_id, actor_name,
                   created_at, expires_at, last_used_at
            FROM vk_message_contexts
            WHERE vk_user_id = ?
              AND expires_at > ?
            ORDER BY COALESCE(last_used_at, created_at) DESC, id DESC
            LIMIT 1
            """,
            (int(vk_user_id), now_iso()),
        ).fetchone()
        if not row:
            return None
        conn.execute("UPDATE vk_message_contexts SET last_used_at = ? WHERE id = ?", (now_iso(), row["id"]))
        return dict(row)


def get_vk_message_context_by_message_id(vk_user_id: int, vk_message_id: Any) -> dict[str, Any] | None:
    if not vk_message_id:
        return None
    context = get_channel_message_context(CHANNEL_VK, vk_user_id, channel_message_id=str(vk_message_id))
    if context:
        return context
    record_channel_legacy_fallback("context_by_message_id")
    with sqlite_conn() as conn:
        row = conn.execute(
            """
            SELECT id, vk_user_id, plane_user_id, issue_id, project_id, workspace_slug,
                   delivery_id, vk_message_id, actor_plane_user_id, actor_name,
                   created_at, expires_at, last_used_at
            FROM vk_message_contexts
            WHERE vk_user_id = ?
              AND vk_message_id = ?
              AND expires_at > ?
            ORDER BY id DESC
            LIMIT 1
            """,
            (int(vk_user_id), str(vk_message_id), now_iso()),
        ).fetchone()
        if not row:
            return None
        conn.execute("UPDATE vk_message_contexts SET last_used_at = ? WHERE id = ?", (now_iso(), row["id"]))
        return dict(row)


def get_vk_message_context_by_issue_id(vk_user_id: int, issue_id: Any) -> dict[str, Any] | None:
    normalized_issue_id = normalize_uuid(issue_id)
    if not normalized_issue_id:
        return None
    context = get_channel_message_context(CHANNEL_VK, vk_user_id, issue_id=normalized_issue_id)
    if context:
        return context
    record_channel_legacy_fallback("context_by_issue_id")
    with sqlite_conn() as conn:
        row = conn.execute(
            """
            SELECT id, vk_user_id, plane_user_id, issue_id, project_id, workspace_slug,
                   delivery_id, vk_message_id, actor_plane_user_id, actor_name,
                   created_at, expires_at, last_used_at
            FROM vk_message_contexts
            WHERE vk_user_id = ?
              AND issue_id = ?
              AND expires_at > ?
            ORDER BY id DESC
            LIMIT 1
            """,
            (int(vk_user_id), normalized_issue_id, now_iso()),
        ).fetchone()
        if not row:
            return None
        conn.execute("UPDATE vk_message_contexts SET last_used_at = ? WHERE id = ?", (now_iso(), row["id"]))
        return dict(row)


def set_vk_message_context_used(context_id: Any) -> None:
    with sqlite_conn() as conn:
        used_at = now_iso()
        conn.execute("UPDATE vk_message_contexts SET last_used_at = ? WHERE id = ?", (used_at, context_id))
        conn.execute(
            "UPDATE message_contexts SET last_used_at = ? WHERE channel = ? AND legacy_context_id = ?",
            (used_at, CHANNEL_VK, context_id),
        )


def get_vk_message_context_by_id(vk_user_id: int, context_id: Any) -> dict[str, Any] | None:
    context = get_channel_message_context(CHANNEL_VK, vk_user_id, legacy_context_id=context_id)
    if context:
        return context
    record_channel_legacy_fallback("context_by_legacy_id")
    with sqlite_conn() as conn:
        row = conn.execute(
            """
            SELECT id, vk_user_id, plane_user_id, issue_id, project_id, workspace_slug,
                   delivery_id, vk_message_id, actor_plane_user_id, actor_name,
                   created_at, expires_at, last_used_at
            FROM vk_message_contexts
            WHERE id = ?
              AND vk_user_id = ?
              AND expires_at > ?
            LIMIT 1
            """,
            (context_id, int(vk_user_id), now_iso()),
        ).fetchone()
        if not row:
            return None
        conn.execute("UPDATE vk_message_contexts SET last_used_at = ? WHERE id = ?", (now_iso(), row["id"]))
        return dict(row)


def set_pending_reply_context(vk_user_id: int, context_id: Any, ttl_minutes: int = 15) -> None:
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=ttl_minutes)
    with sqlite_conn() as conn:
        conn.execute(
            """
            INSERT INTO pending_vk_replies(vk_user_id, context_id, created_at, expires_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(vk_user_id) DO UPDATE SET
              context_id = excluded.context_id,
              created_at = excluded.created_at,
              expires_at = excluded.expires_at
            """,
            (int(vk_user_id), context_id, now.isoformat(), expires_at.isoformat()),
        )
        conn.execute(
            """
            INSERT INTO pending_replies(channel, channel_user_id, legacy_context_id, created_at, expires_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(channel, channel_user_id) DO UPDATE SET
              legacy_context_id = excluded.legacy_context_id,
              created_at = excluded.created_at,
              expires_at = excluded.expires_at
            """,
            (CHANNEL_VK, str(vk_user_id), context_id, now.isoformat(), expires_at.isoformat()),
        )


def get_pending_reply_context(vk_user_id: int) -> dict[str, Any] | None:
    with sqlite_conn() as conn:
        row = conn.execute(
            """
            SELECT legacy_context_id, expires_at FROM pending_replies
            WHERE channel = ? AND channel_user_id = ?
            """,
            (CHANNEL_VK, str(vk_user_id)),
        ).fetchone()
        if row:
            if datetime.fromisoformat(row["expires_at"]) < datetime.now(timezone.utc):
                conn.execute("DELETE FROM pending_replies WHERE channel = ? AND channel_user_id = ?", (CHANNEL_VK, str(vk_user_id)))
                conn.execute("DELETE FROM pending_vk_replies WHERE vk_user_id = ?", (int(vk_user_id),))
                return None
            context_id = row["legacy_context_id"]
        else:
            context_id = None
        if context_id is not None:
            return get_vk_message_context_by_id(vk_user_id, context_id)
        record_channel_legacy_fallback("pending_reply")
        row = conn.execute(
            "SELECT context_id, expires_at FROM pending_vk_replies WHERE vk_user_id = ?",
            (int(vk_user_id),),
        ).fetchone()
        if not row:
            return None
        if datetime.fromisoformat(row["expires_at"]) < datetime.now(timezone.utc):
            conn.execute("DELETE FROM pending_vk_replies WHERE vk_user_id = ?", (int(vk_user_id),))
            return None
    return get_vk_message_context_by_id(vk_user_id, row["context_id"])


def clear_pending_reply_context(vk_user_id: int) -> None:
    with sqlite_conn() as conn:
        conn.execute("DELETE FROM pending_vk_replies WHERE vk_user_id = ?", (int(vk_user_id),))
        conn.execute("DELETE FROM pending_replies WHERE channel = ? AND channel_user_id = ?", (CHANNEL_VK, str(vk_user_id)))


def clear_vk_message_context(vk_user_id: int) -> int:
    with sqlite_conn() as conn:
        conn.execute("DELETE FROM message_contexts WHERE channel = ? AND channel_user_id = ?", (CHANNEL_VK, str(vk_user_id)))
        cursor = conn.execute("DELETE FROM vk_message_contexts WHERE vk_user_id = ?", (int(vk_user_id),))
        return cursor.rowcount


def format_context_message(context: dict[str, Any]) -> str:
    issue = get_issue(context["issue_id"])
    if not issue:
        return "Текущая карточка больше не найдена в Plane."
    identifier = f"{issue['project_identifier']}-{issue['sequence_id']}"
    return "\n".join(
        [
            "Текущая карточка:",
            f"{identifier} {issue['name']}",
            "",
            issue_url(issue),
        ]
    )


async def send_current_context(vk_user_id: int) -> None:
    context = get_latest_vk_message_context(vk_user_id)
    if not context:
        await send_vk_message(
            vk_user_id,
            "Сейчас нет активной карточки. Она появится после ближайшего уведомления Plane.",
            f"context-missing:{vk_user_id}",
        )
        return
    await send_vk_message(vk_user_id, format_context_message(context), f"context:{vk_user_id}:{context['id']}")


async def send_current_issue_link(vk_user_id: int) -> None:
    context = get_latest_vk_message_context(vk_user_id)
    if not context:
        await send_vk_message(
            vk_user_id,
            "Сейчас нет активной карточки. Она появится после ближайшего уведомления Plane.",
            f"open-missing:{vk_user_id}",
        )
        return
    issue = get_issue(context["issue_id"])
    if not issue:
        await send_vk_message(vk_user_id, "Текущая карточка больше не найдена в Plane.", f"open-gone:{vk_user_id}:{context['id']}")
        return
    await send_vk_message(vk_user_id, issue_url(issue), f"open:{vk_user_id}:{context['id']}")


async def cancel_current_context(vk_user_id: int) -> None:
    deleted = clear_vk_message_context(vk_user_id)
    clear_pending_reply_context(vk_user_id)
    message = "Текущая карточка сброшена." if deleted else "Активной карточки не было."
    await send_vk_message(vk_user_id, message, f"cancel-context:{vk_user_id}:{deleted}")


async def save_plane_token_command(vk_user_id: int, raw_token: str) -> None:
    token = raw_token.strip()
    if not token.startswith("plane_api_"):
        await send_vk_message(
            vk_user_id,
            "Это не похоже на Plane API token. Создайте токен в Plane: Settings -> Profile -> API Tokens, затем отправьте /plane_token plane_api_...",
            f"plane-token-format:{vk_user_id}",
        )
        return
    link = get_link_by_vk_user_id(vk_user_id)
    if not link or not link.get("enabled") or not link.get("vk_allowed"):
        await send_vk_message(vk_user_id, "Сначала привяжите VK к Plane через /link ваша_почта@domain.ru.", f"plane-token-unlinked:{vk_user_id}")
        return
    ok, error = validate_plane_api_token_owner(token, link["plane_user_id"])
    if not ok:
        messages = {
            "not_found": "Plane не принял этот API token. Проверьте, что скопировали его полностью из Plane.",
            "inactive": "Этот Plane API token не активен.",
            "expired": "Этот Plane API token истек. Создайте новый в Plane.",
            "owner_mismatch": "Этот Plane API token принадлежит другому Plane-пользователю. Создайте токен в своем профиле Plane.",
        }
        await send_vk_message(vk_user_id, messages.get(error or "", "Не удалось проверить Plane API token."), f"plane-token-invalid:{vk_user_id}:{error}")
        return
    if not save_user_api_token(vk_user_id, link["plane_user_id"], token):
        await send_vk_message(
            vk_user_id,
            "Не могу сохранить токен: администратору нужно настроить NOTIFIER_TOKEN_ENCRYPTION_KEY или SECRET_KEY.",
            f"plane-token-no-encryption:{vk_user_id}",
        )
        return
    await send_vk_message(
        vk_user_id,
        "Plane API token сохранен. Теперь комментарии из VK будут отправляться от вашего имени.\n\nРекомендуем удалить сообщение с токеном из истории VK.",
        f"plane-token-saved:{vk_user_id}:{token_hash(token)[:8]}",
    )


async def send_plane_token_status(vk_user_id: int) -> None:
    row = get_user_api_token_row(vk_user_id)
    if not row:
        await send_vk_message(
            vk_user_id,
            "Персональный Plane API token не сохранен. Добавьте его командой /plane_token plane_api_...",
            f"plane-token-status-missing:{vk_user_id}",
        )
        return
    await send_vk_message(
        vk_user_id,
        "Персональный Plane API token сохранен. Комментарии из VK будут отправляться от вашего имени.",
        f"plane-token-status-ok:{vk_user_id}",
    )


async def delete_plane_token_command(vk_user_id: int) -> None:
    deleted = delete_user_api_token(vk_user_id)
    message = "Персональный Plane API token удален." if deleted else "Персональный Plane API token не был сохранен."
    await send_vk_message(vk_user_id, message, f"plane-token-delete:{vk_user_id}:{deleted}")


async def prompt_comment_reply(vk_user_id: int, context: dict[str, Any] | None = None) -> None:
    context = context or get_latest_vk_message_context(vk_user_id)
    if not context:
        await send_vk_message(
            vk_user_id,
            "Сейчас нет активной карточки. Дождитесь уведомления Plane или откройте карточку командой /context.",
            f"reply-missing:{vk_user_id}",
        )
        return
    issue = get_issue(context["issue_id"])
    if not issue:
        await send_vk_message(vk_user_id, "Текущая карточка больше не найдена в Plane.", f"reply-gone:{vk_user_id}:{context['id']}")
        return
    identifier = f"{issue['project_identifier']}-{issue['sequence_id']}"
    set_pending_reply_context(vk_user_id, context["id"])
    await send_vk_message(
        vk_user_id,
        f"Ответ пойдет в \"{identifier}\".\n\"{issue['name']}\"\n\nВаш комментарий:",
        f"reply-help:{vk_user_id}:{context['id']}",
    )


async def add_context_comment(vk_user_id: int, comment_text: str, context: dict[str, Any] | None = None) -> None:
    text = comment_text.strip()
    if not text:
        await prompt_comment_reply(vk_user_id, context)
        return
    context = context or get_latest_vk_message_context(vk_user_id)
    if not context:
        await send_vk_message(
            vk_user_id,
            "Не нашел активную карточку для ответа. Контекст появляется после уведомления Plane и действует 24 часа.",
            f"comment-missing:{vk_user_id}",
        )
        return
    link = get_link_by_vk_user_id(vk_user_id)
    if not link or not link.get("enabled") or not link.get("vk_allowed"):
        await send_vk_message(vk_user_id, "Сначала привяжите VK к Plane через /link ваша_почта@domain.ru.", f"comment-unlinked:{vk_user_id}")
        return
    if link["plane_user_id"] != context["plane_user_id"]:
        await send_vk_message(vk_user_id, "Не могу ответить: привязка пользователя изменилась. Дождитесь нового уведомления.", f"comment-link-mismatch:{vk_user_id}")
        return
    mention_user = None
    if text.startswith("@"):
        text = text[1:].lstrip()
        if not text:
            await prompt_comment_reply(vk_user_id, context)
            return
        actor_id = normalize_uuid(context.get("actor_plane_user_id"))
        if not actor_id:
            await send_vk_message(
                vk_user_id,
                "Не нашел автора исходного уведомления для персонального ответа. Нажмите Ответить на новое уведомление или отправьте текст без @.",
                f"comment-mention-missing:{vk_user_id}:{context['id']}",
            )
            return
        mention_user = {"id": actor_id, "name": context.get("actor_name") or "пользователь Plane"}
    api_token = get_user_api_token(vk_user_id)
    comment_body = text if api_token else fallback_comment_text(link, text)
    ok, error = await create_plane_comment_from_vk(context, comment_body, api_token, mention_user)
    if ok:
        if api_token:
            mark_user_api_token_used(vk_user_id)
        clear_pending_reply_context(vk_user_id)
        await send_vk_message(vk_user_id, "Добавил комментарий в Plane.", f"comment-ok:{vk_user_id}:{context['id']}:{hashlib.sha256(text.encode()).hexdigest()[:8]}")
        return
    if api_token:
        mark_user_api_token_error(vk_user_id, error or "unknown")
    if error == "PLANE_API_TOKEN is not configured":
        await send_vk_message(vk_user_id, "Ответы в Plane еще не включены: администратору нужно настроить PLANE_API_TOKEN.", f"comment-no-token:{vk_user_id}")
        return
    await send_vk_message(vk_user_id, "Не смог добавить комментарий в Plane. Администратор может посмотреть логи notifier.", f"comment-failed:{vk_user_id}:{context['id']}")


async def handle_plane_webhook(scope, receive, send, headers):
    raw_body = await read_body(receive)
    try:
        payload = json.loads(raw_body)
    except json.JSONDecodeError:
        return await json_response(send, 400, {"ok": False, "error": "Bad JSON"})
    ok, error = verify_plane_signature(raw_body, payload, headers.get("x-plane-signature"))
    if not ok:
        return await json_response(send, 401, {"ok": False, "error": error})
    if payload.get("event") not in {"issue", "issue_comment"}:
        return await json_response(send, 200, {"ok": True, "skipped": "unsupported_event"})
    activity = payload.get("activity") or {}
    if activity.get("field") in SKIP_NOTIFICATION_FIELDS:
        return await json_response(send, 200, {"ok": True, "skipped": "technical_field", "field": activity.get("field")})
    if is_comment_payload(payload) and not comment_text_from_payload(payload):
        return await json_response(send, 200, {"ok": True, "skipped": "empty_comment"})
    delivery_id = headers.get("x-plane-delivery")
    if not mark_delivery(delivery_id):
        return await json_response(send, 200, {"ok": True, "skipped": "duplicate"})
    issue_id = get_issue_id(payload)
    if not issue_id:
        return await json_response(send, 200, {"ok": True, "skipped": "no_issue_id"})
    issue = get_issue(issue_id)
    if not issue:
        return await json_response(send, 200, {"ok": True, "skipped": "issue_not_found"})
    actor = get_actor(payload)
    if is_comment_payload(payload):
        comment_text = comment_text_from_payload(payload)
        comment_dedupe_id = "comment:" + hashlib.sha256(
            f"{issue_id}:{actor.get('id') or actor.get('name')}:{comment_text}".encode("utf-8")
        ).hexdigest()
        if not mark_delivery(comment_dedupe_id):
            return await json_response(send, 200, {"ok": True, "skipped": "duplicate_comment"})
        mentioned_ids = mentioned_user_ids_from_payload(payload)
        if mentioned_ids:
            mentioned_users = get_plane_users_by_ids(mentioned_ids)
            recipients = [
                {"plane_user_id": user["id"], "email": user.get("email"), "display_name": user.get("display_name")}
                for user in mentioned_users.values()
                if not (settings.skip_actor and user["id"] == actor["id"])
            ]
        else:
            recipients = [
                user
                for user in get_assignees(issue_id)
                if not (settings.skip_actor and user["plane_user_id"] == actor["id"])
            ]
    else:
        recipients = [
            user
            for user in get_assignees(issue_id)
            if not (settings.skip_actor and user["plane_user_id"] == actor["id"])
        ]
    links_by_id, links_by_email = get_linked_vk_users(
        [user["plane_user_id"] for user in recipients],
        [user["email"] for user in recipients if user.get("email")],
    )
    message = format_message(payload, issue, include_url=False)
    sent = 0
    skipped = 0
    for user in recipients:
        link = links_by_id.get(user["plane_user_id"]) or links_by_email.get(normalize_email(user.get("email")) or "")
        if not link:
            skipped += 1
            log_delivery(delivery_id, user["plane_user_id"], None, issue_id, "not_linked")
            continue
        sent_ok, send_error, vk_message_id = await send_channel_message_result(
            CHANNEL_VK, int(link["vk_user_id"]), message, delivery_id, issue_keyboard(issue)
        )
        if sent_ok:
            sent += 1
            log_delivery(delivery_id, user["plane_user_id"], int(link["vk_user_id"]), issue_id, "sent")
            save_vk_message_context(int(link["vk_user_id"]), user["plane_user_id"], issue, delivery_id, vk_message_id, actor)
        else:
            log_delivery(delivery_id, user["plane_user_id"], int(link["vk_user_id"]), issue_id, "failed", send_error)
    logger.info("processed delivery=%s issue=%s sent=%s skipped=%s", delivery_id, issue_id, sent, skipped)
    return await json_response(send, 200, {"ok": True, "issue_id": issue_id, "recipients": len(recipients), "sent": sent, "skipped": skipped})


async def start_email_link(vk_user_id: int, raw_email: str) -> None:
    email = normalize_email(raw_email)
    if not email:
        log_link_event(vk_user_id, "invalid_email")
        await send_vk_message(
            vk_user_id,
            "Не похоже на email.\n\n" + link_usage_message(),
            f"link-help:{vk_user_id}",
        )
        return
    existing_link = get_link_by_vk_user_id(vk_user_id)
    if existing_link and normalize_email(existing_link.get("email")) == email and existing_link.get("enabled"):
        await send_vk_message(
            vk_user_id,
            (
                f"Этот VK уже привязан к Plane-пользователю {existing_link.get('display_name') or mask_email(email)}.\n\n"
                "Если нужно перепривязать другую почту, отправьте /link новая_почта@domain.ru."
            ),
            f"link-already:{vk_user_id}:{email}",
        )
        return
    plane_user = get_plane_user_by_email(email)
    if not plane_user:
        log_link_event(vk_user_id, "email_not_found", email=email)
        await send_vk_message(
            vk_user_id,
            (
                f"Не нашел пользователя Plane с почтой {mask_email(email)}.\n\n"
                "Проверьте, что указали именно email из профиля Plane, и отправьте команду еще раз:\n"
                "/link ваша_почта@domain.ru"
            ),
            f"link-not-found:{vk_user_id}:{email}",
        )
        return
    if not smtp_is_configured():
        logger.error("SMTP is not configured; cannot send link confirmation to %s", email)
        log_link_event(vk_user_id, "smtp_not_configured", email=email)
        await send_vk_message(
            vk_user_id,
            "Не смог отправить код: почтовая отправка временно недоступна. Администратор уже может проверить настройки Plane SMTP.",
            f"link-smtp-missing:{vk_user_id}",
        )
        return
    code = generate_confirm_code()
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=settings.link_confirm_ttl_minutes)
    with sqlite_conn() as conn:
        conn.execute(
            """
            INSERT INTO pending_email_links(vk_user_id, plane_user_id, email, code_hash, attempts, expires_at, created_at, updated_at)
            VALUES (?, ?, ?, ?, 0, ?, ?, ?)
            ON CONFLICT(vk_user_id) DO UPDATE SET
              plane_user_id = excluded.plane_user_id,
              email = excluded.email,
              code_hash = excluded.code_hash,
              attempts = 0,
              expires_at = excluded.expires_at,
              updated_at = excluded.updated_at
            """,
            (vk_user_id, plane_user["id"], email, hash_confirm_code(code), expires_at.isoformat(), now.isoformat(), now.isoformat()),
        )
    log_link_event(vk_user_id, "code_requested", plane_user["id"], email)
    try:
        send_email(
            email,
            "Код привязки VK к Plane",
            (
                "Вы запросили привязку аккаунта Plane к VK.\n\n"
                f"Код подтверждения: {code}\n\n"
                f"Введите в чате VK: /confirm {code}\n\n"
                f"Код действует {settings.link_confirm_ttl_minutes} минут."
            ),
            render_confirm_email_html(email, code),
        )
    except Exception as exc:
        logger.exception("failed to send confirmation email to %s", email)
        with sqlite_conn() as conn:
            conn.execute("DELETE FROM pending_email_links WHERE vk_user_id = ?", (vk_user_id,))
        log_link_event(vk_user_id, "email_send_failed", plane_user["id"], email, str(exc))
        await send_vk_message(
            vk_user_id,
            "Не смог отправить письмо с кодом. Попробуйте еще раз чуть позже или напишите администратору.",
            f"link-email-failed:{vk_user_id}:{email}",
        )
        return
    await send_vk_message(
        vk_user_id,
        (
            f"Отправил код подтверждения на {mask_email(email)}.\n\n"
            "Когда письмо придет, отправьте код сюда:\n"
            "/confirm 123456\n\n"
            f"Код действует {settings.link_confirm_ttl_minutes} минут."
        ),
        f"link-code-sent:{vk_user_id}:{email}",
    )


async def confirm_email_link(vk_user_id: int, raw_code: str) -> None:
    code = raw_code.strip().upper()
    if not code:
        await send_vk_message(vk_user_id, confirm_usage_message(), f"confirm-help:{vk_user_id}")
        return
    if not (code.isdigit() and len(code) == 6):
        await send_vk_message(
            vk_user_id,
            "Код должен состоять из шести цифр.\n\n" + confirm_usage_message(),
            f"confirm-format:{vk_user_id}",
        )
        return
    with sqlite_conn() as conn:
        row = conn.execute(
            "SELECT vk_user_id, plane_user_id, email, code_hash, attempts, expires_at FROM pending_email_links WHERE vk_user_id = ?",
            (vk_user_id,),
        ).fetchone()
        if not row:
            log_link_event(vk_user_id, "confirm_without_pending")
            await send_vk_message(vk_user_id, "Активной заявки нет. Сначала запросите код:\n/link ваша_почта@domain.ru", f"confirm-no-pending:{vk_user_id}")
            return
        if datetime.fromisoformat(row["expires_at"]) < datetime.now(timezone.utc):
            conn.execute("DELETE FROM pending_email_links WHERE vk_user_id = ?", (vk_user_id,))
            log_link_event(vk_user_id, "code_expired", row["plane_user_id"], row["email"])
            await send_vk_message(vk_user_id, "Код устарел. Запросите новый:\n/link ваша_почта@domain.ru", f"confirm-expired:{vk_user_id}")
            return
        if row["attempts"] >= settings.link_confirm_max_attempts:
            conn.execute("DELETE FROM pending_email_links WHERE vk_user_id = ?", (vk_user_id,))
            log_link_event(vk_user_id, "too_many_attempts", row["plane_user_id"], row["email"])
            await send_vk_message(vk_user_id, "Слишком много попыток. Я сбросил заявку, запросите новый код:\n/link ваша_почта@domain.ru", f"confirm-too-many:{vk_user_id}")
            return
        if not hmac.compare_digest(row["code_hash"], hash_confirm_code(code)):
            conn.execute(
                "UPDATE pending_email_links SET attempts = attempts + 1, updated_at = ? WHERE vk_user_id = ?",
                (now_iso(), vk_user_id),
            )
            attempts_left = max(settings.link_confirm_max_attempts - int(row["attempts"]) - 1, 0)
            log_link_event(vk_user_id, "bad_code", row["plane_user_id"], row["email"], f"attempts_left={attempts_left}")
            await send_vk_message(
                vk_user_id,
                f"Код не подошел. Проверьте письмо и попробуйте еще раз. Осталось попыток: {attempts_left}.",
                f"confirm-bad:{vk_user_id}:{row['attempts']}",
            )
            return
        plane_user_id = row["plane_user_id"]
        email = row["email"]
        conn.execute("DELETE FROM pending_email_links WHERE vk_user_id = ?", (vk_user_id,))
    plane_user = get_plane_user_by_id(plane_user_id)
    if not plane_user:
        log_link_event(vk_user_id, "plane_user_missing", plane_user_id, email)
        await send_vk_message(vk_user_id, "Пользователь Plane больше не найден. Запросите новый код через /link ваша_почта@domain.ru.", f"confirm-user-missing:{vk_user_id}")
        return
    upsert_user_link(plane_user, vk_user_id, email)
    token_ok, token_status = ensure_vk_response_token(vk_user_id, plane_user_id)
    log_link_event(vk_user_id, f"vk_response_token_{token_status}", plane_user_id, email)
    log_link_event(vk_user_id, "linked", plane_user_id, email)
    reply_line = (
        "Ответы из VK будут отправляться в Plane от вашего имени."
        if token_ok
        else "Привязка готова, но токен для ответов не создан. Администратор может проверить настройки notifier."
    )
    await send_vk_message(
        vk_user_id,
        (
            f"Готово, привязка подтверждена.\n\n"
            f"Plane: {plane_user.get('display_name') or email}\n"
            "Теперь уведомления по вашим карточкам будут приходить сюда.\n"
            f"{reply_line}"
        ),
        f"confirm-ok:{vk_user_id}:{plane_user_id}",
    )


def safe_vk_debug_text(value: Any) -> str:
    text = str(value or "")
    lower = text.strip().lower()
    if lower.startswith(("/plane_token ", "plane_token ", "/api_token ", "api_token ")):
        return "<plane_api_token redacted>"
    if "plane_api_" in lower:
        return re.sub(r"plane_api_[A-Za-z0-9_\\-]+", "plane_api_***", text)
    return text[:200]


def parse_vk_payload(value: Any) -> dict[str, Any]:
    if not value:
        return {}
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
        except json.JSONDecodeError:
            return {}
        return parsed if isinstance(parsed, dict) else {}
    return {}


def context_from_vk_message(vk_user_id: int, message: dict[str, Any]) -> dict[str, Any] | None:
    reply_message = message.get("reply_message") or {}
    for key in ("conversation_message_id", "id"):
        context = get_vk_message_context_by_message_id(vk_user_id, reply_message.get(key))
        if context:
            return context

    payload = parse_vk_payload(message.get("payload"))
    if payload.get("channel") not in {None, CHANNEL_VK}:
        return None
    context_id = payload.get("context_id")
    if context_id:
        with sqlite_conn() as conn:
            row = conn.execute(
                """
                SELECT id, vk_user_id, plane_user_id, issue_id, project_id, workspace_slug,
                       delivery_id, vk_message_id, actor_plane_user_id, actor_name,
                       created_at, expires_at, last_used_at
                FROM vk_message_contexts
                WHERE id = ?
                  AND vk_user_id = ?
                  AND expires_at > ?
                LIMIT 1
                """,
                (context_id, int(vk_user_id), now_iso()),
            ).fetchone()
            if row:
                set_vk_message_context_used(row["id"])
                return dict(row)
    if payload.get("issue_id"):
        return get_vk_message_context_by_issue_id(vk_user_id, payload.get("issue_id"))
    return None


async def handle_channel_message(channel: str, sender_id: int, text: str, message: dict[str, Any]) -> None:
    """Run shared incoming-message business logic after a channel adapter validates input."""
    if channel != CHANNEL_VK:
        logger.warning("unsupported incoming notification channel=%s", channel)
        return
    vk_user_id = sender_id
    lower_text = text.lower()
    selected_context = context_from_vk_message(int(vk_user_id), message)
    pending_context = get_pending_reply_context(int(vk_user_id)) if not selected_context else None
    if not text:
        await send_vk_message(int(vk_user_id), user_help_message(), f"vk-empty:{vk_user_id}")
    elif lower_text.startswith("/link "):
        await start_email_link(int(vk_user_id), text.split(maxsplit=1)[1])
    elif lower_text.startswith("link "):
        await start_email_link(int(vk_user_id), text.split(maxsplit=1)[1])
    elif lower_text.startswith("/confirm "):
        await confirm_email_link(int(vk_user_id), text.split(maxsplit=1)[1])
    elif lower_text.startswith("confirm "):
        await confirm_email_link(int(vk_user_id), text.split(maxsplit=1)[1])
    elif text.isdigit() and len(text) == 6:
        await confirm_email_link(int(vk_user_id), text)
    elif lower_text in {"/link", "link"}:
        await send_vk_message(int(vk_user_id), link_usage_message(), f"vk-link-help:{vk_user_id}")
    elif lower_text in {"/confirm", "confirm"}:
        await send_vk_message(int(vk_user_id), confirm_usage_message(), f"vk-confirm-help:{vk_user_id}")
    elif lower_text in {"/context", "context", "контекст"}:
        await send_current_context(int(vk_user_id))
    elif lower_text in {"/open", "open", "открыть"}:
        await send_current_issue_link(int(vk_user_id))
    elif lower_text in {"/cancel", "cancel", "сброс"}:
        await cancel_current_context(int(vk_user_id))
    elif lower_text.startswith("/plane_token "):
        await save_plane_token_command(int(vk_user_id), text.split(maxsplit=1)[1])
    elif lower_text.startswith("plane_token "):
        await save_plane_token_command(int(vk_user_id), text.split(maxsplit=1)[1])
    elif lower_text.startswith("/api_token "):
        await save_plane_token_command(int(vk_user_id), text.split(maxsplit=1)[1])
    elif lower_text.startswith("api_token "):
        await save_plane_token_command(int(vk_user_id), text.split(maxsplit=1)[1])
    elif lower_text in {"/plane_token", "plane_token", "/api_token", "api_token"}:
        await send_vk_message(
            int(vk_user_id),
            "Создайте API token в Plane: Settings -> Profile -> API Tokens, затем отправьте /plane_token plane_api_...",
            f"plane-token-help:{vk_user_id}",
        )
    elif lower_text in {"/token_status", "token_status"}:
        await send_plane_token_status(int(vk_user_id))
    elif lower_text in {"/token_delete", "token_delete"}:
        await delete_plane_token_command(int(vk_user_id))
    elif lower_text.startswith("/comment "):
        await add_context_comment(int(vk_user_id), text.split(maxsplit=1)[1], selected_context)
    elif lower_text.startswith("comment "):
        await add_context_comment(int(vk_user_id), text.split(maxsplit=1)[1], selected_context)
    elif lower_text.startswith("ответ "):
        await add_context_comment(int(vk_user_id), text.split(maxsplit=1)[1], selected_context)
    elif lower_text in {"/comment", "comment", "ответ", "ответить"}:
        await prompt_comment_reply(int(vk_user_id), selected_context)
    elif lower_text in {"start", "/start", "начать", "помощь", "/help", "help"}:
        await send_vk_message(int(vk_user_id), user_help_message(), f"vk-start:{vk_user_id}")
    elif text.startswith("/"):
        await send_vk_message(int(vk_user_id), "Не знаю такую команду.\n\n" + user_help_message(), f"vk-unknown:{vk_user_id}")
    elif selected_context:
        await add_context_comment(int(vk_user_id), text, selected_context)
    elif pending_context:
        await add_context_comment(int(vk_user_id), text, pending_context)


async def handle_vk_callback(scope, receive, send):
    """VK Callback API transport adapter; validation stays specific to VK."""
    raw_body = await read_body(receive)
    try:
        payload = json.loads(raw_body)
    except json.JSONDecodeError:
        logger.warning("VK callback rejected: invalid JSON")
        return await send_response(send, 200, b"ok", "text/plain")
    vk_object = payload.get("object") or {}
    vk_message = vk_object.get("message") or {}
    log_data = {
        "type": payload.get("type"),
        "has_secret": bool(payload.get("secret")),
        "from_id": vk_message.get("from_id"),
        "has_text": bool((vk_message.get("text") or "").strip()),
    }
    if settings.vk_debug:
        log_data["text"] = safe_vk_debug_text(vk_message.get("text"))
    logger.info("VK callback %s", log_data)
    if not hmac.compare_digest(str(payload.get("secret") or ""), settings.vk_callback_secret):
        return await json_response(send, 403, {"error": "Bad VK callback secret"})
    if payload.get("type") == "confirmation":
        return await send_response(send, 200, settings.vk_confirmation_code.encode(), "text/plain")
    if payload.get("type") != "message_new":
        return await send_response(send, 200, b"ok", "text/plain")
    message = vk_message
    vk_user_id = message.get("from_id")
    if not vk_user_id:
        return await send_response(send, 200, b"ok", "text/plain")
    if not mark_delivery(vk_delivery_id(payload, message)):
        return await send_response(send, 200, b"ok", "text/plain")
    await handle_channel_message(CHANNEL_VK, int(vk_user_id), (message.get("text") or "").strip(), message)
    return await send_response(send, 200, b"ok", "text/plain")


async def handle_admin_link_code(scope, receive, send, headers):
    if not verify_admin(headers):
        return await json_response(send, 401, {"error": "Unauthorized"})
    body = json.loads(await read_body(receive))
    plane_user_id = normalize_uuid(body.get("plane_user_id"))
    if not plane_user_id:
        return await json_response(send, 400, {"error": "Invalid plane_user_id"})
    ttl_minutes = int(body.get("ttl_minutes", 1440))
    code = secrets.token_urlsafe(6).replace("-", "").replace("_", "").upper()[:8]
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=ttl_minutes)
    with sqlite_conn() as conn:
        conn.execute("INSERT INTO link_codes(code, plane_user_id, expires_at) VALUES (?, ?, ?)", (code, plane_user_id, expires_at.isoformat()))
    return await json_response(send, 200, {"code": code, "plane_user_id": plane_user_id, "expires_at": expires_at.isoformat(), "message": f"/link {code}"})


async def handle_admin_link(scope, receive, send, headers):
    if not verify_admin(headers):
        return await json_response(send, 401, {"error": "Unauthorized"})
    body = json.loads(await read_body(receive))
    plane_user_id = normalize_uuid(body.get("plane_user_id"))
    if not plane_user_id:
        return await json_response(send, 400, {"error": "Invalid plane_user_id"})
    plane_user = get_plane_user_by_id(plane_user_id)
    email = normalize_email(body.get("email")) or normalize_email((plane_user or {}).get("email"))
    ts = now_iso()
    with sqlite_conn() as conn:
        conn.execute(
            """
            INSERT INTO user_links(plane_user_id, vk_user_id, email, display_name, enabled, vk_allowed, created_at, updated_at)
            VALUES (?, ?, ?, ?, 1, 1, ?, ?)
            ON CONFLICT(plane_user_id) DO UPDATE SET
              vk_user_id = excluded.vk_user_id,
              email = COALESCE(excluded.email, user_links.email),
              display_name = excluded.display_name,
              enabled = 1,
              vk_allowed = 1,
              updated_at = excluded.updated_at
            """,
            (plane_user_id, int(body["vk_user_id"]), email, body.get("display_name") or (plane_user or {}).get("display_name"), ts, ts),
        )
    return await json_response(send, 200, {"ok": True})


async def handle_admin_link_by_email(scope, receive, send, headers):
    if not verify_admin(headers):
        return await json_response(send, 401, {"error": "Unauthorized"})
    body = json.loads(await read_body(receive))
    email = normalize_email(body.get("email"))
    if not email:
        return await json_response(send, 400, {"error": "Invalid email"})
    plane_user = get_plane_user_by_email(email)
    if not plane_user:
        return await json_response(send, 404, {"error": "Plane user not found"})
    ts = now_iso()
    with sqlite_conn() as conn:
        conn.execute(
            """
            INSERT INTO user_links(plane_user_id, vk_user_id, email, display_name, enabled, vk_allowed, created_at, updated_at)
            VALUES (?, ?, ?, ?, 1, 1, ?, ?)
            ON CONFLICT(plane_user_id) DO UPDATE SET
              vk_user_id = excluded.vk_user_id,
              email = excluded.email,
              display_name = excluded.display_name,
              enabled = 1,
              vk_allowed = 1,
              updated_at = excluded.updated_at
            """,
            (plane_user["id"], int(body["vk_user_id"]), email, body.get("display_name") or plane_user.get("display_name"), ts, ts),
        )
    return await json_response(send, 200, {"ok": True, "plane_user_id": plane_user["id"], "email": email})


async def handle_admin_links(send, headers):
    if not verify_admin(headers):
        return await json_response(send, 401, {"error": "Unauthorized"})
    with sqlite_conn() as conn:
        rows = conn.execute(
            "SELECT plane_user_id, vk_user_id, email, display_name, enabled, vk_allowed, last_error, updated_at FROM user_links ORDER BY updated_at DESC"
        ).fetchall()
    return await json_response(send, 200, [dict(row) for row in rows])


async def handle_admin_link_events(send, headers):
    if not verify_admin(headers):
        return await json_response(send, 401, {"error": "Unauthorized"})
    with sqlite_conn() as conn:
        rows = conn.execute(
            """
            SELECT id, vk_user_id, plane_user_id, email, event, detail, created_at
            FROM link_events
            ORDER BY id DESC
            LIMIT 100
            """
        ).fetchall()
    return await json_response(send, 200, [dict(row) for row in rows])


async def app(scope, receive, send):
    if scope["type"] == "lifespan":
        while True:
            message = await receive()
            if message["type"] == "lifespan.startup":
                await send({"type": "lifespan.startup.complete"})
            elif message["type"] == "lifespan.shutdown":
                await send({"type": "lifespan.shutdown.complete"})
                return
    if scope["type"] != "http":
        return
    method = scope["method"]
    path = scope["path"]
    headers = header_dict(scope)
    try:
        if method == "GET" and path == "/health":
            return await json_response(send, 200, {"status": "ok", "channel_read_fallbacks": CHANNEL_READ_FALLBACKS})
        if path == "/plane/webhook" and method in {"GET", "HEAD"}:
            return await json_response(send, 200, {"ok": True})
        if method == "POST" and path == "/plane/webhook":
            return await handle_plane_webhook(scope, receive, send, headers)
        if method == "POST" and path == "/vk/callback":
            return await handle_vk_callback(scope, receive, send)
        if method == "POST" and path == "/admin/link-code":
            return await handle_admin_link_code(scope, receive, send, headers)
        if method == "POST" and path == "/admin/link":
            return await handle_admin_link(scope, receive, send, headers)
        if method == "POST" and path == "/admin/link-by-email":
            return await handle_admin_link_by_email(scope, receive, send, headers)
        if method == "GET" and path == "/admin/links":
            return await handle_admin_links(send, headers)
        if method == "GET" and path == "/admin/link-events":
            return await handle_admin_link_events(send, headers)
        return await json_response(send, 404, {"error": "Not found"})
    except Exception as exc:
        logger.exception("request failed: %s %s", method, path)
        return await json_response(send, 500, {"error": "internal error"})
