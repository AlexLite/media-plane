# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

"""Runtime safety bootstrap for Plane Messenger Gateway."""

import os

_PLACEHOLDERS = {
    "change-me",
    "<change-me>",
    "<plane-webhook-secret>",
    "<vk-callback-secret>",
    "<notifier-token-encryption-key>",
}


def _require_secret(name: str, *, min_length: int = 24) -> str:
    value = os.getenv(name, "").strip()
    if not value or value.lower() in _PLACEHOLDERS or len(value) < min_length:
        raise RuntimeError(f"{name} must be replaced with a strong secret of at least {min_length} characters")
    return value


_require_secret("ADMIN_TOKEN", min_length=32)
_require_secret("PLANE_WEBHOOK_SECRET")
_require_secret("VK_CALLBACK_SECRET")

from .asgi import app  # noqa: E402

__all__ = ["app"]
