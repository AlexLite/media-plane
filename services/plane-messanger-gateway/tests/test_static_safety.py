# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

"""Tests for Plane Messanger Gateway safety invariants."""

from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = ROOT.parents[1]


class StaticSafetyTests(unittest.TestCase):
    def test_dockerfile_uses_secure_entrypoint(self):
        dockerfile = (ROOT / "Dockerfile").read_text(encoding="utf-8")
        self.assertIn("uvicorn app.secure_entrypoint:app", dockerfile)
        self.assertNotIn("app.main:app", dockerfile)

    def test_dockerfile_installs_requirements(self):
        dockerfile = (ROOT / "Dockerfile").read_text(encoding="utf-8")
        self.assertIn("pip install --no-cache-dir -r requirements.txt", dockerfile)

    def test_env_example_does_not_ship_working_credentials(self):
        env_example = (ROOT / ".env.example").read_text(encoding="utf-8")
        self.assertNotIn("192.168.", env_example)
        self.assertNotIn("ADMIN_TOKEN=change-me", env_example)
        self.assertNotIn("ADMIN_TOKEN=<change-me>", env_example)
        self.assertNotIn("PLANE_API_TOKEN=plane_api_", env_example)

    def test_overlay_binds_host_port_to_loopback(self):
        overlay = (REPO_ROOT / "docker-compose.messanger-gateway.yml").read_text(encoding="utf-8")
        self.assertIn("127.0.0.1:${PLANE_MESSANGER_GATEWAY_PORT:-8083}:8083", overlay)

    def test_overlay_allows_exact_gateway_hostname_for_plane(self):
        overlay = (REPO_ROOT / "docker-compose.messanger-gateway.yml").read_text(encoding="utf-8")
        self.assertIn("WEBHOOK_ALLOWED_HOSTS: ${WEBHOOK_ALLOWED_HOSTS:-plane-messanger-gateway}", overlay)
        self.assertIn("api:", overlay)
        self.assertIn("worker:", overlay)

    def test_docs_use_docker_dns_for_plane_webhook(self):
        docs = (REPO_ROOT / "docs" / "messanger-gateway.md").read_text(encoding="utf-8")
        self.assertIn("http://plane-messanger-gateway:8083/plane/webhook", docs)
        self.assertIn("Do not configure Plane with `http://127.0.0.1:8083/plane/webhook`", docs)

    def test_legacy_entrypoint_is_only_a_wrapper(self):
        legacy = (ROOT / "app" / "main.py").read_text(encoding="utf-8")
        self.assertIn("from app.secure_entrypoint import app", legacy)
        self.assertNotIn("FastAPI(", legacy)

    def test_codeql_sensitive_hashes_use_blake2(self):
        asgi = (ROOT / "app" / "asgi.py").read_text(encoding="utf-8")
        send = asgi.split("async def send_vk_message_result", 1)[1].split("def token_encryption_secret", 1)[0]
        fingerprint = asgi.split("def token_hash", 1)[1].split("def get_user_api_token_row", 1)[0]
        self.assertIn("hashlib.blake2s", send)
        self.assertNotIn("hashlib.sha256", send)
        self.assertIn("hashlib.blake2b", fingerprint)
        self.assertIn("key=key", fingerprint)


if __name__ == "__main__":
    unittest.main()
