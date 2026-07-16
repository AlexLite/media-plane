# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from uuid import uuid4

import pytest

from plane.app.views.issue.freeframe_review_public import freeframe_public_api_url
from plane.db.models import FreeFrameReviewLink, Issue, Project, ProjectMember


pytestmark = pytest.mark.django_db


def _url(workspace, project, issue):
    return (
        f"/api/workspaces/{workspace.slug}/projects/{project.id}/issues/"
        f"{issue.id}/freeframe-review-session/"
    )


@pytest.fixture
def review_project(workspace, create_user):
    project = Project.objects.create(name="UXP Review", identifier="UXP", workspace=workspace)
    ProjectMember.objects.create(
        workspace=workspace,
        project=project,
        member=create_user,
        role=20,
        is_active=True,
    )
    return project


@pytest.fixture
def linked_review_issue(workspace, review_project):
    issue = Issue.objects.create(
        workspace=workspace,
        project=review_project,
        name="Review Premiere export",
    )
    FreeFrameReviewLink.objects.create(issue=issue, asset_id=uuid4())
    return issue


@pytest.fixture
def unlinked_review_issue(workspace, review_project):
    return Issue.objects.create(
        workspace=workspace,
        project=review_project,
        name="Review without a linked asset",
    )


def test_linked_session_returns_server_controlled_public_api_url(
    session_client,
    workspace,
    review_project,
    linked_review_issue,
):
    response = session_client.get(_url(workspace, review_project, linked_review_issue))

    assert response.status_code == 200
    assert response.data["freeframe_api_url"] == "https://freeframe.example.test/api"
    assert "http://freeframe-api:8000" not in str(response.data)
    assert response["Cache-Control"] == "no-store, private"


def test_unlinked_session_preserves_controlled_unlinked_response(
    session_client,
    workspace,
    review_project,
    unlinked_review_issue,
    monkeypatch,
):
    monkeypatch.delenv("FREEFRAME_REVIEW_PUBLIC_API_URL")

    response = session_client.get(_url(workspace, review_project, unlinked_review_issue))

    assert response.status_code == 404
    assert response.data == {
        "error": "FreeFrame review is not linked",
        "can_manage": True,
    }


@pytest.mark.parametrize(
    "value",
    [
        "",
        "http://freeframe.example.test",
        "https://user:secret@freeframe.example.test",
        "https://freeframe.example.test/api?token=bad",
        "https://freeframe.example.test/api#fragment",
        " https://freeframe.example.test",
        "https://freeframe.example.test:invalid/api",
        "https://freeframe.example.test\\api",
    ],
)
def test_invalid_public_api_url_fails_closed(
    value,
    session_client,
    workspace,
    review_project,
    linked_review_issue,
    monkeypatch,
):
    monkeypatch.setenv("FREEFRAME_REVIEW_PUBLIC_API_URL", value)

    response = session_client.get(_url(workspace, review_project, linked_review_issue))

    assert response.status_code == 503
    assert "configured securely" in response.data["error"]


def test_public_api_url_normalization_is_https_only(monkeypatch):
    monkeypatch.setenv(
        "FREEFRAME_REVIEW_PUBLIC_API_URL",
        "https://freeframe.example.test//api///v1///",
    )
    assert freeframe_public_api_url() == "https://freeframe.example.test/api/v1"
