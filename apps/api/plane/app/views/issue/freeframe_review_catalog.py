# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from urllib.parse import urlencode

from rest_framework import status
from rest_framework.response import Response

from plane.app.permissions import ProjectLitePermission

from ..base import BaseAPIView
from .freeframe_review import (
    FreeFrameReviewConfigurationError,
    FreeFrameReviewUpstreamError,
    _configuration_error_response,
    _exchange_freeframe_session,
    _freeframe_request,
    _issue,
    _mint_integration_token,
    _review_scopes,
    _upstream_error_response,
)

ALLOWED_ASSET_TYPES = frozenset({"video", "image", "image_carousel", "audio"})


def _catalog_context(request, slug, project_id, issue_id):
    scopes = _review_scopes(request, slug, project_id)
    if "review:manage" not in scopes:
        return None, Response(
            {"error": "You don't have the required permissions."},
            status=status.HTTP_403_FORBIDDEN,
        )

    issue = _issue(slug, project_id, issue_id)
    if not issue:
        return None, Response(
            {"error": "Work item not found"},
            status=status.HTTP_404_NOT_FOUND,
        )

    try:
        integration_token, _ttl_seconds = _mint_integration_token(
            request,
            issue,
            scopes,
        )
        access_token = _exchange_freeframe_session(integration_token)
    except FreeFrameReviewConfigurationError as error:
        return None, _configuration_error_response(error)
    except FreeFrameReviewUpstreamError as error:
        return None, _upstream_error_response(error)

    return access_token, None


def _private_response(payload, *, response_status=status.HTTP_200_OK):
    response = Response(payload, status=response_status)
    response["Cache-Control"] = "no-store, private"
    response["Pragma"] = "no-cache"
    return response


class FreeFrameReviewCatalogEndpoint(BaseAPIView):
    """Proxy the scoped FreeFrame catalog without exposing its access token."""

    permission_classes = [ProjectLitePermission]

    def get(self, request, slug, project_id, issue_id):
        access_token, error_response = _catalog_context(
            request,
            slug,
            project_id,
            issue_id,
        )
        if error_response:
            return error_response

        query = str(request.query_params.get("q", "")).strip()
        if len(query) > 100:
            return Response(
                {"error": "Search query is too long"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            limit = int(request.query_params.get("limit", 50))
        except (TypeError, ValueError):
            return Response(
                {"error": "limit must be an integer"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if limit < 1 or limit > 100:
            return Response(
                {"error": "limit must be between 1 and 100"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        params = {"limit": limit}
        if query:
            params["q"] = query

        try:
            payload = _freeframe_request(
                "GET",
                f"/integrations/plane/catalog/assets?{urlencode(params)}",
                access_token=access_token,
            )
        except FreeFrameReviewConfigurationError as error:
            return _configuration_error_response(error)
        except FreeFrameReviewUpstreamError as error:
            return _upstream_error_response(error)

        if not isinstance(payload, list):
            return Response(
                {"error": "FreeFrame returned an invalid asset catalog"},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        return _private_response(payload)

    def post(self, request, slug, project_id, issue_id):
        access_token, error_response = _catalog_context(
            request,
            slug,
            project_id,
            issue_id,
        )
        if error_response:
            return error_response

        name = request.data.get("name")
        description = request.data.get("description")
        asset_type = request.data.get("asset_type")

        if not isinstance(name, str) or not name.strip() or len(name.strip()) > 255:
            return Response(
                {"error": "A valid asset name is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if description is not None and (
            not isinstance(description, str) or len(description.strip()) > 2000
        ):
            return Response(
                {"error": "Asset description is invalid"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if asset_type not in ALLOWED_ASSET_TYPES:
            return Response(
                {"error": "A supported asset_type is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        body = {
            "name": name.strip(),
            "description": description.strip() if isinstance(description, str) else None,
            "asset_type": asset_type,
        }
        try:
            payload = _freeframe_request(
                "POST",
                "/integrations/plane/catalog/assets",
                payload=body,
                access_token=access_token,
            )
        except FreeFrameReviewConfigurationError as error:
            return _configuration_error_response(error)
        except FreeFrameReviewUpstreamError as error:
            return _upstream_error_response(error)

        if not isinstance(payload, dict) or not isinstance(payload.get("id"), str):
            return Response(
                {"error": "FreeFrame returned an invalid created asset"},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        return _private_response(payload, response_status=status.HTTP_201_CREATED)
