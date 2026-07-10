# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from datetime import date, timedelta

import pytest
from rest_framework import status

from plane.db.models import Issue, IssuePipelineItem, Project, ProjectMember, State, StateGroup


@pytest.fixture
def project(db, workspace, create_user):
    project = Project.objects.create(
        name="Pipeline Project",
        identifier="PIPE",
        workspace=workspace,
        created_by=create_user,
    )
    ProjectMember.objects.create(
        project=project,
        member=create_user,
        role=20,
        is_active=True,
    )
    return project


@pytest.fixture
def project_states(project):
    return [
        State.objects.create(
            name=name,
            color="#60646C",
            sequence=sequence,
            group=group,
            project=project,
            is_pipeline_enabled=True,
        )
        for name, sequence, group in [
            ("Briefing", 10000, StateGroup.BACKLOG.value),
            ("Script", 20000, StateGroup.UNSTARTED.value),
            ("Editing", 30000, StateGroup.STARTED.value),
            ("Delivery", 40000, StateGroup.COMPLETED.value),
        ]
    ]


@pytest.fixture
def parent_issue(project, project_states):
    return Issue.objects.create(
        name="Produce video",
        project=project,
        state=project_states[0],
        target_date=date.today() + timedelta(days=30),
    )


def pipeline_url(workspace_slug, project_id, issue_id):
    return f"/api/workspaces/{workspace_slug}/projects/{project_id}/issues/{issue_id}/pipeline/"


def pipeline_initialize_url(workspace_slug, project_id, issue_id):
    return f"{pipeline_url(workspace_slug, project_id, issue_id)}initialize/"


def pipeline_complete_url(workspace_slug, project_id, issue_id, item_id):
    return f"{pipeline_url(workspace_slug, project_id, issue_id)}{item_id}/complete/"


def issue_detail_url(workspace_slug, project_id, issue_id):
    return f"/api/workspaces/{workspace_slug}/projects/{project_id}/issues/{issue_id}/"


def pipeline_item_url(workspace_slug, project_id, issue_id, pipeline_item_id):
    return f"{pipeline_url(workspace_slug, project_id, issue_id)}{pipeline_item_id}/"


def issue_dates_url(workspace_slug, project_id):
    return f"/api/workspaces/{workspace_slug}/projects/{project_id}/issue-dates/"


PARENT_DEADLINE_ERROR = "Parent issue target date cannot be earlier than existing pipeline step due dates"


@pytest.mark.contract
class TestIssuePipelineAPI:
    @pytest.mark.django_db
    def test_initialize_pipeline_creates_metadata_items_and_is_idempotent(
        self, session_client, workspace, project, project_states, parent_issue
    ):
        url = pipeline_initialize_url(workspace.slug, project.id, parent_issue.id)

        response = session_client.post(url, {}, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert IssuePipelineItem.objects.filter(parent_issue=parent_issue).count() == len(project_states)
        assert Issue.objects.filter(parent=parent_issue).count() == 0
        assert [item["state_name_snapshot"] for item in response.data] == [state.name for state in project_states]
        assert all(item["hidden_from_board"] is True for item in response.data)
        assert all("child_issue_id" not in item for item in response.data)
        assert all("child_issue_detail" not in item for item in response.data)
        assert response.data[0]["status"] == IssuePipelineItem.StatusChoices.ACTIVE

        second_response = session_client.post(url, {}, format="json")

        assert second_response.status_code == status.HTTP_200_OK
        assert IssuePipelineItem.objects.filter(parent_issue=parent_issue).count() == len(project_states)
        assert Issue.objects.filter(parent=parent_issue).count() == 0

    @pytest.mark.django_db
    def test_complete_active_pipeline_item_moves_parent_to_next_state(
        self, session_client, workspace, project, project_states, parent_issue
    ):
        session_client.post(pipeline_initialize_url(workspace.slug, project.id, parent_issue.id), {}, format="json")
        active_item = IssuePipelineItem.objects.get(parent_issue=parent_issue, status=IssuePipelineItem.StatusChoices.ACTIVE)

        response = session_client.post(
            pipeline_complete_url(workspace.slug, project.id, parent_issue.id, active_item.id), {}, format="json"
        )

        parent_issue.refresh_from_db()
        active_item.refresh_from_db()
        next_item = IssuePipelineItem.objects.get(parent_issue=parent_issue, pipeline_state=project_states[1])
        assert response.status_code == status.HTTP_200_OK
        assert active_item.status == IssuePipelineItem.StatusChoices.COMPLETED
        assert active_item.completed_at is not None
        assert active_item.completed_by_id is not None
        assert next_item.status == IssuePipelineItem.StatusChoices.ACTIVE
        assert parent_issue.state_id == project_states[1].id

    @pytest.mark.django_db
    def test_complete_pending_pipeline_item_is_rejected(self, session_client, workspace, project, parent_issue):
        session_client.post(pipeline_initialize_url(workspace.slug, project.id, parent_issue.id), {}, format="json")
        pending_item = IssuePipelineItem.objects.filter(
            parent_issue=parent_issue, status=IssuePipelineItem.StatusChoices.PENDING
        ).first()

        response = session_client.post(
            pipeline_complete_url(workspace.slug, project.id, parent_issue.id, pending_item.id), {}, format="json"
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    @pytest.mark.django_db
    def test_manual_parent_forward_move_auto_completes_previous_items(
        self, session_client, create_user, workspace, project, project_states, parent_issue
    ):
        session_client.post(pipeline_initialize_url(workspace.slug, project.id, parent_issue.id), {}, format="json")

        response = session_client.patch(
            issue_detail_url(workspace.slug, project.id, parent_issue.id),
            {"state_id": str(project_states[2].id)},
            format="json",
        )

        briefing = IssuePipelineItem.objects.get(parent_issue=parent_issue, pipeline_state=project_states[0])
        script = IssuePipelineItem.objects.get(parent_issue=parent_issue, pipeline_state=project_states[1])
        editing = IssuePipelineItem.objects.get(parent_issue=parent_issue, pipeline_state=project_states[2])
        delivery = IssuePipelineItem.objects.get(parent_issue=parent_issue, pipeline_state=project_states[3])
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert briefing.status == IssuePipelineItem.StatusChoices.COMPLETED
        assert script.status == IssuePipelineItem.StatusChoices.COMPLETED
        assert script.auto_completed is True
        assert script.completed_by_id == create_user.id
        assert script.completed_at is not None
        assert editing.status == IssuePipelineItem.StatusChoices.ACTIVE
        assert delivery.status == IssuePipelineItem.StatusChoices.PENDING

    @pytest.mark.django_db
    def test_manual_parent_backward_move_clears_completion_metadata_and_sets_active(
        self, session_client, workspace, project, project_states, parent_issue
    ):
        session_client.post(pipeline_initialize_url(workspace.slug, project.id, parent_issue.id), {}, format="json")
        session_client.patch(
            issue_detail_url(workspace.slug, project.id, parent_issue.id),
            {"state_id": str(project_states[2].id)},
            format="json",
        )
        completed_item = IssuePipelineItem.objects.get(parent_issue=parent_issue, pipeline_state=project_states[1])
        response = session_client.patch(
            issue_detail_url(workspace.slug, project.id, parent_issue.id),
            {"state_id": str(project_states[1].id)},
            format="json",
        )

        completed_item.refresh_from_db()
        editing = IssuePipelineItem.objects.get(parent_issue=parent_issue, pipeline_state=project_states[2])
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert completed_item.status == IssuePipelineItem.StatusChoices.ACTIVE
        assert completed_item.completed_at is None
        assert completed_item.completed_by_id is None
        assert completed_item.auto_completed is False
        assert editing.status == IssuePipelineItem.StatusChoices.PENDING

    @pytest.mark.django_db
    def test_due_date_validation_rejects_pipeline_item_date_after_parent(
        self, session_client, workspace, project, parent_issue
    ):
        session_client.post(pipeline_initialize_url(workspace.slug, project.id, parent_issue.id), {}, format="json")
        pipeline_item = IssuePipelineItem.objects.filter(parent_issue=parent_issue).first()

        response = session_client.patch(
            pipeline_item_url(workspace.slug, project.id, parent_issue.id, pipeline_item.id),
            {"target_date": str(parent_issue.target_date + timedelta(days=1))},
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    @pytest.mark.django_db
    def test_due_date_validation_rejects_parent_date_before_native_pipeline_item(
        self, session_client, workspace, project, parent_issue
    ):
        session_client.post(pipeline_initialize_url(workspace.slug, project.id, parent_issue.id), {}, format="json")
        pipeline_item = IssuePipelineItem.objects.filter(parent_issue=parent_issue).first()
        pipeline_target_date = parent_issue.target_date - timedelta(days=5)

        pipeline_response = session_client.patch(
            pipeline_item_url(workspace.slug, project.id, parent_issue.id, pipeline_item.id),
            {"target_date": str(pipeline_target_date)},
            format="json",
        )
        response = session_client.patch(
            issue_detail_url(workspace.slug, project.id, parent_issue.id),
            {"target_date": str(pipeline_target_date - timedelta(days=1))},
            format="json",
        )

        assert pipeline_response.status_code == status.HTTP_200_OK
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["target_date"][0] == PARENT_DEADLINE_ERROR

    @pytest.mark.django_db
    def test_bulk_due_date_validation_rejects_parent_date_before_native_pipeline_item(
        self, session_client, workspace, project, parent_issue
    ):
        session_client.post(pipeline_initialize_url(workspace.slug, project.id, parent_issue.id), {}, format="json")
        pipeline_item = IssuePipelineItem.objects.filter(parent_issue=parent_issue).first()
        pipeline_target_date = parent_issue.target_date - timedelta(days=5)

        pipeline_response = session_client.patch(
            pipeline_item_url(workspace.slug, project.id, parent_issue.id, pipeline_item.id),
            {"target_date": str(pipeline_target_date)},
            format="json",
        )
        response = session_client.post(
            issue_dates_url(workspace.slug, project.id),
            {"updates": [{"id": str(parent_issue.id), "target_date": str(pipeline_target_date - timedelta(days=1))}]},
            format="json",
        )

        assert pipeline_response.status_code == status.HTTP_200_OK
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["message"] == PARENT_DEADLINE_ERROR
