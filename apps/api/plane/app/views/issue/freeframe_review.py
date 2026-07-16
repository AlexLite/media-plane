# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

import json
import os
from datetime import timedelta
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen
from uuid import UUID, uuid4

import jwt
from django.conf import settings
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response

from plane.app.permissions import ProjectLitePermission
from plane.app.permissions.base import ROLE
from plane.db.models import FreeFrameReviewLink, Issue, ProjectMember, WorkspaceMember

from ..base import BaseAPIView


DEFAULT_TOKEN_TTL_SECONDS = 300
MAX_TOKEN_TTL_SECONDS = 900
DEFAULT_UPSTREAM_TIMEOUT_SECONDS = 5
MAX_UPSTREAM_TIMEOUT_SECONDS = 30


class FreeFrameReviewConfigurationError(Exception):
    pass


class FreeFrameReviewUpstreamError(Exception):
    def __init__(self, status_code, detail):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


def _token_ttl_seconds() -> int:
    try:
        configured = int(os.environ.get("FREEFRAME_REVIEW_TOKEN_TTL_SECONDS", DEFAULT_TOKEN_TTL_SECONDS))
    except (TypeError, ValueError):
        configured = DEFAULT_TOKEN_TTL_SECONDS
    return max(60, min(configured, MAX_TOKEN_TTL_SECONDS))


def _upstream_timeout_seconds() -> int:
    try:
        configured = int(
            os.environ.get("FREEFRAME_REVIEW_API_TIMEOUT_SECONDS", DEFAULT_UPSTREAM_TIMEOUT_SECONDS)
        )
    except (TypeError, ValueError):
        configured = DEFAULT_UPSTREAM_TIMEOUT_SECONDS
    return max(1, min(configured, MAX_UPSTREAM_TIMEOUT_SECONDS))


def _review_scopes(request, slug, project_id):
    project_member = ProjectMember.objects.filter(
        workspace__slug=slug,
        project_id=project_id,
        member=request.user,
        is_active=True,
    ).first()
    if not project_member:
        return []

    scopes = ["review:read", "review:comment"]
    if project_member.role in [ROLE.MEMBER.value, ROLE.ADMIN.value]:
        scopes.append("review:upload")

    workspace_admin = WorkspaceMember.objects.filter(
        workspace__slug=slug,
        member=request.user,
        role=ROLE.ADMIN.value,
        is_active=True,
    ).exists()
    if project_member.role == ROLE.ADMIN.value or workspace_admin:
        if "review:upload" not in scopes:
            scopes.append("review:upload")
        scopes.append("review:manage")

    return scopes


def _can_manage_link(request, slug, project_id):
    return "review:manage" in _review_scopes(request, slug, project_id)


def _issue(slug, project_id, issue_id):
    return Issue.objects.filter(
        id=issue_id,
        project_id=project_id,
        workspace__slug=slug,
        deleted_at__isnull=True,
    ).first()


def _signing_secret():
    secret = os.environ.get("FREEFRAME_REVIEW_JWT_SECRET", "").strip()
    if not secret or secret == settings.SECRET_KEY:
        return None
    return secret


def _freeframe_api_url():
    value = os.environ.get("FREEFRAME_REVIEW_API_URL", "").strip().rstrip("/")
    if not value:
        return None

    parsed = urlsplit(value)
    if (
        parsed.scheme not in {"http", "https"}
        or not parsed.netloc
        or parsed.username
        or parsed.password
        or parsed.query
        or parsed.fragment
    ):
        return None
    return value


def _mint_integration_token(request, issue, scopes):
    secret = _signing_secret()
    if not secret:
        raise FreeFrameReviewConfigurationError(
            "FreeFrame review signing secret is not configured securely"
        )

    issued_at = timezone.now()
    ttl_seconds = _token_ttl_seconds()
    token = jwt.encode(
        {
            "iss": os.environ.get("FREEFRAME_REVIEW_TOKEN_ISSUER", "media-plane"),
            "aud": os.environ.get("FREEFRAME_REVIEW_TOKEN_AUDIENCE", "freeframe-review"),
            "iat": int(issued_at.timestamp()),
            "nbf": int(issued_at.timestamp()),
            "exp": int((issued_at + timedelta(seconds=ttl_seconds)).timestamp()),
            "jti": str(uuid4()),
            "sub": str(request.user.id),
            "email": request.user.email,
            "name": request.user.full_name or request.user.email,
            "workspace_id": str(issue.workspace_id),
            "project_id": str(issue.project_id),
            "issue_id": str(issue.id),
            "scopes": scopes,
        },
        secret,
        algorithm="HS256",
    )
    return token, ttl_seconds


def _upstream_detail(error):
    try:
        body = error.read(4096)
        payload = json.loads(body.decode("utf-8")) if body else {}
    except (UnicodeDecodeError, ValueError, OSError):
        payload = {}

    detail = payload.get("detail") or payload.get("error")
    if not isinstance(detail, str):
        return "FreeFrame rejected the review-link request"
    return detail[:300]


def _freeframe_request(method, path, *, payload=None, access_token=None):
    api_url = _freeframe_api_url()
    if not api_url:
        raise FreeFrameReviewConfigurationError(
            "FreeFrame review API URL is not configured securely"
        )

    body = json.dumps(payload).encode("utf-8") if payload is not None else None
    headers = {"Accept": "application/json"}
    if payload is not None:
        headers["Content-Type"] = "application/json"
    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"

    request = Request(
        f"{api_url}{path}",
        data=body,
        headers=headers,
        method=method,
    )
    try:
        with urlopen(request, timeout=_upstream_timeout_seconds()) as response:  # noqa: S310
            raw = response.read()
    except HTTPError as error:
        raise FreeFrameReviewUpstreamError(error.code, _upstream_detail(error)) from error
    except (URLError, TimeoutError, OSError) as error:
        raise FreeFrameReviewUpstreamError(
            status.HTTP_502_BAD_GATEWAY,
            "FreeFrame review service is unavailable",
        ) from error

    if not raw:
        return {}
    try:
        return json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, ValueError) as error:
        raise FreeFrameReviewUpstreamError(
            status.HTTP_502_BAD_GATEWAY,
            "FreeFrame returned an invalid response",
        ) from error


def _exchange_freeframe_session(integration_token):
    payload = _freeframe_request(
        "POST",
        "/integrations/plane/session",
        payload={"token": integration_token},
    )
    access_token = payload.get("access_token")
    if not isinstance(access_token, str) or not access_token:
        raise FreeFrameReviewUpstreamError(
            status.HTTP_502_BAD_GATEWAY,
            "FreeFrame did not return a scoped session",
        )
    return access_token


def _register_freeframe_link(asset_id, integration_token):
    access_token = _exchange_freeframe_session(integration_token)
    _freeframe_request(
        "POST",
        f"/integrations/plane/assets/{asset_id}/link",
        access_token=access_token,
    )


def _unregister_freeframe_link(asset_id, integration_token):
    access_token = _exchange_freeframe_session(integration_token)
    _freeframe_request(
        "DELETE",
        f"/integrations/plane/assets/{asset_id}/link",
        access_token=access_token,
    )


def _configuration_error_response(error):
    return Response(
        {"error": str(error)},
        status=status.HTTP_503_SERVICE_UNAVAILABLE,
    )


def _upstream_error_response(error):
    if error.status_code in {
        status.HTTP_400_BAD_REQUEST,
        status.HTTP_404_NOT_FOUND,
        status.HTTP_409_CONFLICT,
        status.HTTP_422_UNPROCESSABLE_ENTITY,
    }:
        response_status = (
            status.HTTP_400_BAD_REQUEST
            if error.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
            else error.status_code
        )
        return Response({"error": error.detail}, status=response_status)

    if error.status_code in {status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN}:
        return Response(
            {"error": "FreeFrame rejected the Plane integration session"},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    return Response(
        {"error": error.detail},
        status=status.HTTP_502_BAD_GATEWAY,
    )


class FreeFrameReviewSessionEndpoint(BaseAPIView):
    """Synchronize an issue-to-asset binding and mint short-lived review tokens."""

    permission_classes = [ProjectLitePermission]

    def get(self, request, slug, project_id, issue_id):
        issue = _issue(slug, project_id, issue_id)
        if not issue:
            return Response({"error": "Work item not found"}, status=status.HTTP_404_NOT_FOUND)

        scopes = _review_scopes(request, slug, project_id)
        can_manage = "review:manage" in scopes
        link = FreeFrameReviewLink.objects.filter(issue=issue).first()
        if not link:
            return Response(
                {"error": "FreeFrame review is not linked", "can_manage": can_manage},
                status=status.HTTP_404_NOT_FOUND,
            )

        if "review:read" not in scopes:
            return Response({"error": "You don't have the required permissions."}, status=status.HTTP_403_FORBIDDEN)

        try:
            token, ttl_seconds = _mint_integration_token(request, issue, scopes)
        except FreeFrameReviewConfigurationError as error:
            return _configuration_error_response(error)

        response = Response(
            {
                "asset_id": str(link.asset_id),
                "integration_token": token,
                "expires_in": ttl_seconds,
                "can_manage": can_manage,
            },
            status=status.HTTP_200_OK,
        )
        response["Cache-Control"] = "no-store, private"
        response["Pragma"] = "no-cache"
        return response

    def put(self, request, slug, project_id, issue_id):
        scopes = _review_scopes(request, slug, project_id)
        if "review:manage" not in scopes:
            return Response({"error": "You don't have the required permissions."}, status=status.HTTP_403_FORBIDDEN)

        issue = _issue(slug, project_id, issue_id)
        if not issue:
            return Response({"error": "Work item not found"}, status=status.HTTP_404_NOT_FOUND)

        try:
            asset_id = UUID(str(request.data.get("asset_id", "")))
        except (TypeError, ValueError):
            return Response({"error": "A valid asset_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        existing = FreeFrameReviewLink.objects.filter(issue=issue).first()
        if existing and existing.asset_id != asset_id:
            return Response(
                {"error": "Work item is already linked to another FreeFrame asset"},
                status=status.HTTP_409_CONFLICT,
            )

        try:
            integration_token, _ttl_seconds = _mint_integration_token(request, issue, scopes)
            _register_freeframe_link(asset_id, integration_token)
        except FreeFrameReviewConfigurationError as error:
            return _configuration_error_response(error)
        except FreeFrameReviewUpstreamError as error:
            return _upstream_error_response(error)

        if existing:
            return Response({"asset_id": str(existing.asset_id)}, status=status.HTTP_200_OK)

        try:
            with transaction.atomic():
                link = FreeFrameReviewLink.objects.create(issue=issue, asset_id=asset_id)
        except IntegrityError:
            current = FreeFrameReviewLink.objects.filter(issue=issue, asset_id=asset_id).first()
            if current:
                return Response({"asset_id": str(current.asset_id)}, status=status.HTTP_200_OK)
            return Response(
                {"error": "FreeFrame asset is already linked to another work item"},
                status=status.HTTP_409_CONFLICT,
            )

        return Response({"asset_id": str(link.asset_id)}, status=status.HTTP_201_CREATED)

    def delete(self, request, slug, project_id, issue_id):
        scopes = _review_scopes(request, slug, project_id)
        if "review:manage" not in scopes:
            return Response({"error": "You don't have the required permissions."}, status=status.HTTP_403_FORBIDDEN)

        issue = _issue(slug, project_id, issue_id)
        if not issue:
            return Response({"error": "Work item not found"}, status=status.HTTP_404_NOT_FOUND)

        link = FreeFrameReviewLink.objects.filter(issue=issue).first()
        if not link:
            return Response({"error": "FreeFrame review is not linked"}, status=status.HTTP_404_NOT_FOUND)

        try:
            integration_token, _ttl_seconds = _mint_integration_token(request, issue, scopes)
            _unregister_freeframe_link(link.asset_id, integration_token)
        except FreeFrameReviewConfigurationError as error:
            return _configuration_error_response(error)
        except FreeFrameReviewUpstreamError as error:
            return _upstream_error_response(error)

        FreeFrameReviewLink.objects.filter(id=link.id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
