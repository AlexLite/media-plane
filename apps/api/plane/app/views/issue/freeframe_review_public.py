# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

import os
from urllib.parse import urlsplit, urlunsplit

from plane.app.views.issue.freeframe_review import (
    FreeFrameReviewConfigurationError,
    FreeFrameReviewSessionEndpoint,
    _configuration_error_response,
)
from plane.utils.url import normalize_url_path


def freeframe_public_api_url():
    value = os.environ.get("FREEFRAME_REVIEW_PUBLIC_API_URL", "")
    if not value or value.strip() != value or any(character.isspace() for character in value):
        return None

    try:
        parsed = urlsplit(value)
        parsed.port
    except ValueError:
        return None

    if (
        parsed.scheme != "https"
        or not parsed.netloc
        or not parsed.hostname
        or "\\" in value
        or parsed.username
        or parsed.password
        or parsed.query
        or parsed.fragment
    ):
        return None

    normalized = urlunsplit(("https", parsed.netloc, parsed.path.rstrip("/"), "", ""))
    return normalize_url_path(normalized)


class FreeFrameReviewPublicSessionEndpoint(FreeFrameReviewSessionEndpoint):
    """Add a server-controlled UXP-reachable FreeFrame API URL to linked sessions."""

    def get(self, request, slug, project_id, issue_id):
        response = super().get(request, slug, project_id, issue_id)
        if response.status_code != 200:
            return response

        api_url = freeframe_public_api_url()
        if not api_url:
            return _configuration_error_response(
                FreeFrameReviewConfigurationError(
                    "Public FreeFrame review API URL is not configured securely"
                )
            )

        response.data["freeframe_api_url"] = api_url
        return response
