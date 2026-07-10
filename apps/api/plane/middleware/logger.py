# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

# Python imports
import logging
import hashlib
import hmac
import json
import time
from urllib.parse import parse_qsl, urlencode

# Django imports
from django.conf import settings
from django.http import HttpRequest
from django.utils import timezone

# Third party imports
from rest_framework.request import Request

# Module imports
from plane.utils.ip_address import get_client_ip
from plane.utils.exception_logger import log_exception
from plane.bgtasks.logger_task import process_logs

api_logger = logging.getLogger("plane.api.request")

SENSITIVE_HEADER_NAMES = {
    "authorization",
    "cookie",
    "proxy-authorization",
    "set-cookie",
    "x-api-key",
    "x-auth-token",
}
SENSITIVE_VALUE_NAMES = {"access_token", "api_key", "authorization", "code", "cookie", "password", "refresh_token", "secret", "token"}


def is_sensitive_name(name: str) -> bool:
    normalized_name = name.lower().replace("-", "_")
    return normalized_name in SENSITIVE_VALUE_NAMES or any(
        sensitive_name in normalized_name for sensitive_name in SENSITIVE_VALUE_NAMES
    )


def build_token_identifier(api_key: str) -> str:
    """
    Build a stable, non-reversible identifier for API token logs.

    We use a keyed HMAC digest so the same token always maps to the same
    identifier without persisting the raw secret.
    """
    return hmac.new(
        settings.SECRET_KEY.encode("utf-8"),
        api_key.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def sanitize_request_headers(request: Request | HttpRequest) -> str:
    """Return request headers without credentials or session material."""
    return str(
        {
            name: "[REDACTED]" if name.lower() in SENSITIVE_HEADER_NAMES or is_sensitive_name(name) else value
            for name, value in request.headers.items()
        }
    )


def sanitize_query_params(query_string: str) -> str:
    return urlencode(
        [(name, "[REDACTED]" if is_sensitive_name(name) else value) for name, value in parse_qsl(query_string, keep_blank_values=True)]
    )


def sanitize_body(content: bytes | None) -> str | None:
    if not content:
        return None

    try:
        payload = json.loads(content.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return "[REDACTED NON-JSON CONTENT]"

    def redact(value):
        if isinstance(value, dict):
            return {key: "[REDACTED]" if is_sensitive_name(key) else redact(child) for key, child in value.items()}
        if isinstance(value, list):
            return [redact(child) for child in value]
        return value

    return json.dumps(redact(payload), ensure_ascii=False)


class RequestLoggerMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def _should_log_route(self, request: Request | HttpRequest) -> bool:
        """
        Determines whether a route should be logged based on the request and status code.
        """
        # Don't log health checks
        if request.path == "/" and request.method == "GET":
            return False
        return True

    def __call__(self, request):
        # get the start time
        start_time = time.time()

        # Get the response
        response = self.get_response(request)

        # calculate the duration
        duration = time.time() - start_time

        # Check if logging is required
        log_true = self._should_log_route(request=request)

        # If logging is not required, return the response
        if not log_true:
            return response

        user_id = (
            request.user.id if getattr(request, "user") and getattr(request.user, "is_authenticated", False) else None
        )

        user_agent = request.META.get("HTTP_USER_AGENT", "")

        # Log the request information
        api_logger.info(
            f"{request.method} {request.get_full_path()} {response.status_code}",
            extra={
                "path": request.path,
                "method": request.method,
                "status_code": response.status_code,
                "duration_ms": int(duration * 1000),
                "remote_addr": get_client_ip(request),
                "user_agent": user_agent,
                "user_id": user_id,
            },
        )

        # return the response
        return response


class APITokenLogMiddleware:
    """
    Middleware to log External API requests to MongoDB or PostgreSQL.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request_body = request.body
        response = self.get_response(request)
        self.process_request(request, response, request_body)
        return response

    def _safe_decode_body(self, content):
        """
        Safely decodes request/response body content, handling binary data.
        Returns None if content is None, or a string representation of the content.
        """
        # If the content is None, return None
        if content is None:
            return None

        # If the content is an empty bytes object, return None
        if content == b"":
            return None

        # Check if content is binary by looking for common binary file signatures
        if content.startswith(b"\x89PNG") or content.startswith(b"\xff\xd8\xff") or content.startswith(b"%PDF"):
            return "[Binary Content]"

        try:
            return content.decode("utf-8")
        except UnicodeDecodeError:
            return "[Could not decode content]"

    def process_request(self, request, response, request_body):
        api_key_header = "X-Api-Key"
        api_key = request.headers.get(api_key_header)

        # If the API key is not present, return
        if not api_key:
            return

        try:
            log_data = {
                "token_identifier": build_token_identifier(api_key),
                "path": request.path,
                "method": request.method,
                "query_params": sanitize_query_params(request.META.get("QUERY_STRING", "")),
                "headers": sanitize_request_headers(request),
                "body": sanitize_body(request_body),
                "response_body": sanitize_body(response.content),
                "response_code": response.status_code,
                "ip_address": get_client_ip(request=request),
                "user_agent": request.META.get("HTTP_USER_AGENT", None),
            }
            user_id = (
                str(request.user.id)
                if getattr(request, "user") and getattr(request.user, "is_authenticated", False)
                else None
            )
            # Additional fields for MongoDB
            mongo_log = {
                **log_data,
                "created_at": timezone.now(),
                "updated_at": timezone.now(),
                "created_by": user_id,
                "updated_by": user_id,
            }

            process_logs.delay(log_data=log_data, mongo_log=mongo_log)

        except Exception as e:
            log_exception(e)

        return None
