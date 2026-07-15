# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

import os
from datetime import timedelta
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


def _token_ttl_seconds() -> int:
    try:
        configured = int(os.environ.get("FREEFRAME_REVIEW_TOKEN_TTL_SECONDS", DEFAULT_TOKEN_TTL_SECONDS))
    except (TypeError, ValueError):
        configured = DEFAULT_TOKEN_TTL_SECONDS
    return max(60, min(configured, MAX_TOKEN_TTL_SECONDS))


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


class FreeFrameReviewSessionEndpoint(BaseAPIView):
    """Manage an issue-to-asset binding and mint short-lived FreeFrame tokens."""

    permission_classes = [ProjectLitePermission]

    def get(self, request, slug, project_id, issue_id):
        issue = _issue(slug, project_id, issue_id)
        if not issue:
            return Response({"error": "Work item not found"}, status=status.HTTP_404_NOT_FOUND)

        link = FreeFrameReviewLink.objects.filter(issue=issue).first()
        if not link:
            return Response({"error": "FreeFrame review is not linked"}, status=status.HTTP_404_NOT_FOUND)

        secret = _signing_secret()
        if not secret:
            return Response(
                {"error": "FreeFrame review integration is not configured securely"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        scopes = _review_scopes(request, slug, project_id)
        if "review:read" not in scopes:
            return Response({"error": "You don't have the required permissions."}, status=status.HTTP_403_FORBIDDEN)

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

        response = Response(
            {
                "asset_id": str(link.asset_id),
                "integration_token": token,
                "expires_in": ttl_seconds,
            },
            status=status.HTTP_200_OK,
        )
        response["Cache-Control"] = "no-store, private"
        response["Pragma"] = "no-cache"
        return response

    def put(self, request, slug, project_id, issue_id):
        if not _can_manage_link(request, slug, project_id):
            return Response({"error": "You don't have the required permissions."}, status=status.HTTP_403_FORBIDDEN)

        issue = _issue(slug, project_id, issue_id)
        if not issue:
            return Response({"error": "Work item not found"}, status=status.HTTP_404_NOT_FOUND)

        try:
            asset_id = UUID(str(request.data.get("asset_id", "")))
        except (TypeError, ValueError):
            return Response({"error": "A valid asset_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        existing = FreeFrameReviewLink.objects.filter(issue=issue).first()
        if existing:
            if existing.asset_id == asset_id:
                return Response({"asset_id": str(existing.asset_id)}, status=status.HTTP_200_OK)
            return Response(
                {"error": "Work item is already linked to another FreeFrame asset"},
                status=status.HTTP_409_CONFLICT,
            )

        try:
            with transaction.atomic():
                link = FreeFrameReviewLink.objects.create(issue=issue, asset_id=asset_id)
        except IntegrityError:
            return Response(
                {"error": "FreeFrame asset is already linked to another work item"},
                status=status.HTTP_409_CONFLICT,
            )

        return Response({"asset_id": str(link.asset_id)}, status=status.HTTP_201_CREATED)

    def delete(self, request, slug, project_id, issue_id):
        if not _can_manage_link(request, slug, project_id):
            return Response({"error": "You don't have the required permissions."}, status=status.HTTP_403_FORBIDDEN)

        issue = _issue(slug, project_id, issue_id)
        if not issue:
            return Response({"error": "Work item not found"}, status=status.HTTP_404_NOT_FOUND)

        deleted = FreeFrameReviewLink.objects.filter(issue=issue).delete()
        if not deleted:
            return Response({"error": "FreeFrame review is not linked"}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)
