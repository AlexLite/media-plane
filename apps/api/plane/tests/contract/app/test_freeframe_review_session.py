# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from types import SimpleNamespace
from unittest.mock import MagicMock
from uuid import uuid4

import jwt
import pytest
from django.conf import settings
from rest_framework.test import APIClient

from plane.app.views.issue import freeframe_review as review_module
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


@pytest.fixture(autouse=True)
def configured_freeframe(monkeypatch):
    monkeypatch.setenv("FREEFRAME_REVIEW_JWT_SECRET", "plane-freeframe-test-secret")
    monkeypatch.setenv("FREEFRAME_REVIEW_API_URL", "http://freeframe-api:8000")
    register = MagicMock()
    unregister = MagicMock()
    monkeypatch.setattr(review_module, "_register_freeframe_link", register)
    monkeypatch.setattr(review_module, "_unregister_freeframe_link", unregister)
    return SimpleNamespace(register=register, unregister=unregister)


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
    configured_freeframe,
    monkeypatch,
):
    secret = "plane-freeframe-test-secret"
    monkeypatch.setenv("FREEFRAME_REVIEW_TOKEN_TTL_SECONDS", "120")
    asset_id = uuid4()
    url = _url(workspace, review_project, review_issue)

    link_response = session_client.put(url, {"asset_id": str(asset_id)}, format="json")
    assert link_response.status_code == 201
    assert FreeFrameReviewLink.objects.filter(issue=review_issue, asset_id=asset_id).exists()
    configured_freeframe.register.assert_called_once()
    register_asset_id, register_token = configured_freeframe.register.call_args.args
    assert register_asset_id == asset_id
    assert isinstance(register_token, str) and register_token

    response = session_client.get(url)
    assert response.status_code == 200
    assert response.data["asset_id"] == str(asset_id)
    assert response.data["expires_in"] == 120
    assert response.data["can_manage"] is True
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


def test_unlinked_issue_returns_manage_capability(session_client, workspace, review_project, review_issue):
    response = session_client.get(_url(workspace, review_project, review_issue))

    assert response.status_code == 404
    assert response.data["can_manage"] is True


def test_missing_signing_secret_fails_closed(session_client, workspace, review_project, review_issue, monkeypatch):
    monkeypatch.delenv("FREEFRAME_REVIEW_JWT_SECRET", raising=False)
    FreeFrameReviewLink.objects.create(issue=review_issue, asset_id=uuid4())

    response = session_client.get(_url(workspace, review_project, review_issue))
    assert response.status_code == 503


def test_plane_secret_cannot_be_reused_for_review_tokens(
    session_client,
    workspace,
    review_project,
    review_issue,
    monkeypatch,
):
    monkeypatch.setenv("FREEFRAME_REVIEW_JWT_SECRET", settings.SECRET_KEY)
    FreeFrameReviewLink.objects.create(issue=review_issue, asset_id=uuid4())

    response = session_client.get(_url(workspace, review_project, review_issue))
    assert response.status_code == 503


def test_member_receives_upload_scope_but_cannot_manage_link(
    workspace,
    review_project,
    review_issue,
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

    client = APIClient()
    client.force_authenticate(user=member)
    url = _url(workspace, review_project, review_issue)

    response = client.get(url)
    assert response.status_code == 200
    assert response.data["can_manage"] is False
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


def test_guest_receives_only_read_and_comment_scopes(workspace, review_project, review_issue):
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

    client = APIClient()
    client.force_authenticate(user=guest)
    response = client.get(_url(workspace, review_project, review_issue))

    assert response.status_code == 200
    assert response.data["can_manage"] is False
    claims = jwt.decode(
        response.data["integration_token"],
        "plane-freeframe-test-secret",
        algorithms=["HS256"],
        audience="freeframe-review",
        issuer="media-plane",
    )
    assert claims["scopes"] == ["review:read", "review:comment"]


def test_workspace_admin_can_manage_when_project_role_is_guest(
    workspace,
    review_project,
    review_issue,
):
    workspace_admin = User.objects.create(
        email="workspace-admin@plane.so",
        username="freeframe-workspace-admin",
        first_name="Workspace",
        last_name="Admin",
    )
    WorkspaceMember.objects.create(workspace=workspace, member=workspace_admin, role=20, is_active=True)
    ProjectMember.objects.create(
        workspace=workspace,
        project=review_project,
        member=workspace_admin,
        role=5,
        is_active=True,
    )

    client = APIClient()
    client.force_authenticate(user=workspace_admin)
    url = _url(workspace, review_project, review_issue)

    assert client.put(url, {"asset_id": str(uuid4())}, format="json").status_code == 201
    response = client.get(url)
    assert response.data["can_manage"] is True
    claims = jwt.decode(
        response.data["integration_token"],
        "plane-freeframe-test-secret",
        algorithms=["HS256"],
        audience="freeframe-review",
        issuer="media-plane",
    )
    assert claims["scopes"] == ["review:read", "review:comment", "review:upload", "review:manage"]


def test_link_is_immutable_until_remote_first_delete(
    session_client,
    workspace,
    review_project,
    review_issue,
    configured_freeframe,
):
    first_asset = uuid4()
    second_asset = uuid4()
    url = _url(workspace, review_project, review_issue)

    assert session_client.put(url, {"asset_id": str(first_asset)}, format="json").status_code == 201
    assert session_client.put(url, {"asset_id": str(first_asset)}, format="json").status_code == 200
    assert session_client.put(url, {"asset_id": str(second_asset)}, format="json").status_code == 409
    assert session_client.delete(url).status_code == 204
    configured_freeframe.unregister.assert_called_once()
    unregister_asset_id, unregister_token = configured_freeframe.unregister.call_args.args
    assert unregister_asset_id == first_asset
    assert isinstance(unregister_token, str) and unregister_token
    assert not FreeFrameReviewLink.objects.filter(issue=review_issue).exists()
    assert session_client.put(url, {"asset_id": str(second_asset)}, format="json").status_code == 201


def test_remote_link_failure_does_not_create_local_binding(
    session_client,
    workspace,
    review_project,
    review_issue,
    configured_freeframe,
):
    configured_freeframe.register.side_effect = review_module.FreeFrameReviewUpstreamError(
        502,
        "FreeFrame review service is unavailable",
    )

    response = session_client.put(
        _url(workspace, review_project, review_issue),
        {"asset_id": str(uuid4())},
        format="json",
    )

    assert response.status_code == 502
    assert not FreeFrameReviewLink.objects.filter(issue=review_issue).exists()


def test_remote_unlink_failure_preserves_local_binding(
    session_client,
    workspace,
    review_project,
    review_issue,
    configured_freeframe,
):
    link = FreeFrameReviewLink.objects.create(issue=review_issue, asset_id=uuid4())
    configured_freeframe.unregister.side_effect = review_module.FreeFrameReviewUpstreamError(
        502,
        "FreeFrame review service is unavailable",
    )

    response = session_client.delete(_url(workspace, review_project, review_issue))

    assert response.status_code == 502
    assert FreeFrameReviewLink.objects.filter(id=link.id).exists()


def test_invalid_freeframe_api_url_fails_closed(monkeypatch):
    monkeypatch.setenv("FREEFRAME_REVIEW_API_URL", "https://user:secret@freeframe.invalid/api?token=bad")

    with pytest.raises(review_module.FreeFrameReviewConfigurationError):
        review_module._freeframe_request("POST", "/integrations/plane/session", payload={"token": "jwt"})


def test_remote_registration_exchanges_plane_token_for_scoped_session(monkeypatch):
    request_mock = MagicMock(side_effect=[{"access_token": "scoped-access-token"}, {}])
    monkeypatch.setattr(review_module, "_freeframe_request", request_mock)
    asset_id = uuid4()

    review_module._register_freeframe_link(asset_id, "plane-integration-token")

    assert request_mock.call_args_list[0].args == ("POST", "/integrations/plane/session")
    assert request_mock.call_args_list[0].kwargs == {"payload": {"token": "plane-integration-token"}}
    assert request_mock.call_args_list[1].args == (
        "POST",
        f"/integrations/plane/assets/{asset_id}/link",
    )
    assert request_mock.call_args_list[1].kwargs == {"access_token": "scoped-access-token"}
