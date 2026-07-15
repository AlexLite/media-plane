# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from uuid import uuid4

import jwt
import pytest
from rest_framework.test import APIClient

from plane.db.models import (
    FreeFrameReviewLink,
    Issue,
    Project,
    ProjectMember,
    User,
    WorkspaceMember,
)


pytestmark = pytest.mark.django_db


def _url(workspace, project, issue):
    return (
        f"/api/workspaces/{workspace.slug}/projects/{project.id}/issues/"
        f"{issue.id}/freeframe-review-session/"
    )


@pytest.fixture
def review_project(workspace, create_user):
    project = Project.objects.create(name="Media Review", identifier="MEDIA", workspace=workspace)
    ProjectMember.objects.create(
        workspace=workspace,
        project=project,
        member=create_user,
        role=20,
        is_active=True,
    )
    return project


@pytest.fixture
def review_issue(workspace, review_project):
    return Issue.objects.create(
        workspace=workspace,
        project=review_project,
        name="Review campaign cut",
    )


def test_admin_can_link_and_receive_scoped_short_lived_token(
    session_client,
    create_user,
    workspace,
    review_project,
    review_issue,
    monkeypatch,
):
    secret = "plane-freeframe-test-secret"
    monkeypatch.setenv("FREEFRAME_REVIEW_JWT_SECRET", secret)
    monkeypatch.setenv("FREEFRAME_REVIEW_TOKEN_TTL_SECONDS", "120")
    asset_id = uuid4()
    url = _url(workspace, review_project, review_issue)

    link_response = session_client.put(url, {"asset_id": str(asset_id)}, format="json")
    assert link_response.status_code == 201
    assert FreeFrameReviewLink.objects.filter(issue=review_issue, asset_id=asset_id).exists()

    response = session_client.get(url)
    assert response.status_code == 200
    assert response.data["asset_id"] == str(asset_id)
    assert response.data["expires_in"] == 120
    assert response["Cache-Control"] == "no-store, private"

    claims = jwt.decode(
        response.data["integration_token"],
        secret,
        algorithms=["HS256"],
        audience="freeframe-review",
        issuer="media-plane",
    )
    assert claims["sub"] == str(create_user.id)
    assert claims["workspace_id"] == str(workspace.id)
    assert claims["project_id"] == str(review_project.id)
    assert claims["issue_id"] == str(review_issue.id)
    assert claims["scopes"] == ["review:read", "review:comment", "review:upload", "review:manage"]
    assert 110 <= claims["exp"] - claims["iat"] <= 120


def test_unlinked_issue_returns_not_found(session_client, workspace, review_project, review_issue, monkeypatch):
    monkeypatch.setenv("FREEFRAME_REVIEW_JWT_SECRET", "plane-freeframe-test-secret")
    response = session_client.get(_url(workspace, review_project, review_issue))
    assert response.status_code == 404


def test_missing_signing_secret_fails_closed(session_client, workspace, review_project, review_issue, monkeypatch):
    monkeypatch.delenv("FREEFRAME_REVIEW_JWT_SECRET", raising=False)
    FreeFrameReviewLink.objects.create(issue=review_issue, asset_id=uuid4())

    response = session_client.get(_url(workspace, review_project, review_issue))
    assert response.status_code == 503


def test_member_receives_upload_scope_but_cannot_manage_link(
    workspace,
    review_project,
    review_issue,
    monkeypatch,
):
    member = User.objects.create(
        email="member@plane.so",
        username="freeframe-member",
        first_name="Review",
        last_name="Member",
    )
    WorkspaceMember.objects.create(workspace=workspace, member=member, role=15, is_active=True)
    ProjectMember.objects.create(
        workspace=workspace,
        project=review_project,
        member=member,
        role=15,
        is_active=True,
    )
    FreeFrameReviewLink.objects.create(issue=review_issue, asset_id=uuid4())
    monkeypatch.setenv("FREEFRAME_REVIEW_JWT_SECRET", "plane-freeframe-test-secret")

    client = APIClient()
    client.force_authenticate(user=member)
    url = _url(workspace, review_project, review_issue)

    response = client.get(url)
    assert response.status_code == 200
    claims = jwt.decode(
        response.data["integration_token"],
        "plane-freeframe-test-secret",
        algorithms=["HS256"],
        audience="freeframe-review",
        issuer="media-plane",
    )
    assert claims["scopes"] == ["review:read", "review:comment", "review:upload"]

    forbidden = client.put(url, {"asset_id": str(uuid4())}, format="json")
    assert forbidden.status_code == 403


def test_guest_receives_only_read_and_comment_scopes(workspace, review_project, review_issue, monkeypatch):
    guest = User.objects.create(
        email="guest@plane.so",
        username="freeframe-guest",
        first_name="Review",
        last_name="Guest",
    )
    WorkspaceMember.objects.create(workspace=workspace, member=guest, role=5, is_active=True)
    ProjectMember.objects.create(
        workspace=workspace,
        project=review_project,
        member=guest,
        role=5,
        is_active=True,
    )
    FreeFrameReviewLink.objects.create(issue=review_issue, asset_id=uuid4())
    monkeypatch.setenv("FREEFRAME_REVIEW_JWT_SECRET", "plane-freeframe-test-secret")

    client = APIClient()
    client.force_authenticate(user=guest)
    response = client.get(_url(workspace, review_project, review_issue))

    assert response.status_code == 200
    claims = jwt.decode(
        response.data["integration_token"],
        "plane-freeframe-test-secret",
        algorithms=["HS256"],
        audience="freeframe-review",
        issuer="media-plane",
    )
    assert claims["scopes"] == ["review:read", "review:comment"]


def test_link_is_immutable_until_deleted(session_client, workspace, review_project, review_issue):
    first_asset = uuid4()
    second_asset = uuid4()
    url = _url(workspace, review_project, review_issue)

    assert session_client.put(url, {"asset_id": str(first_asset)}, format="json").status_code == 201
    assert session_client.put(url, {"asset_id": str(first_asset)}, format="json").status_code == 200
    assert session_client.put(url, {"asset_id": str(second_asset)}, format="json").status_code == 409
    assert session_client.delete(url).status_code == 204
    assert not FreeFrameReviewLink.objects.filter(issue=review_issue).exists()
    assert session_client.put(url, {"asset_id": str(second_asset)}, format="json").status_code == 201
