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


def issue_list_url(workspace_slug, project_id):
    return f"/api/workspaces/{workspace_slug}/projects/{project_id}/issues/"


def issue_detail_list_url(workspace_slug, project_id):
    return f"/api/workspaces/{workspace_slug}/projects/{project_id}/issues-detail/"


def workspace_issue_list_url(workspace_slug):
    return f"/api/workspaces/{workspace_slug}/issues/"


def global_search_url(workspace_slug):
    return f"/api/workspaces/{workspace_slug}/search/"


def issue_detail_url(workspace_slug, project_id, issue_id):
    return f"/api/workspaces/{workspace_slug}/projects/{project_id}/issues/{issue_id}/"


def issue_dates_url(workspace_slug, project_id):
    return f"/api/workspaces/{workspace_slug}/projects/{project_id}/issue-dates/"


def find_id_in_payload(payload, issue_id):
    if isinstance(payload, dict):
        if str(payload.get("id")) == str(issue_id):
            return True
        return any(find_id_in_payload(value, issue_id) for value in payload.values())
    if isinstance(payload, list):
        return any(find_id_in_payload(value, issue_id) for value in payload)
    return False


@pytest.mark.contract
class TestIssuePipelineAPI:
    @pytest.mark.django_db
    def test_initialize_pipeline_creates_hidden_child_issues_and_is_idempotent(
        self, session_client, workspace, project, project_states, parent_issue
    ):
        url = pipeline_initialize_url(workspace.slug, project.id, parent_issue.id)

        response = session_client.post(url, {}, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert IssuePipelineItem.objects.filter(parent_issue=parent_issue).count() == len(project_states)
        assert Issue.objects.filter(parent=parent_issue).count() == len(project_states)
        assert [item["state_name_snapshot"] for item in response.data] == [state.name for state in project_states]
        assert all(item["hidden_from_board"] is True for item in response.data)
        assert response.data[0]["status"] == IssuePipelineItem.StatusChoices.ACTIVE

        second_response = session_client.post(url, {}, format="json")

        assert second_response.status_code == status.HTTP_200_OK
        assert IssuePipelineItem.objects.filter(parent_issue=parent_issue).count() == len(project_states)
        assert Issue.objects.filter(parent=parent_issue).count() == len(project_states)

    @pytest.mark.django_db
    def test_pipeline_children_are_hidden_from_normal_issue_list_but_directly_accessible(
        self, session_client, workspace, project, parent_issue
    ):
        session_client.post(pipeline_initialize_url(workspace.slug, project.id, parent_issue.id), {}, format="json")
        pipeline_item = IssuePipelineItem.objects.filter(parent_issue=parent_issue).first()

        list_response = session_client.get(issue_list_url(workspace.slug, project.id))
        detail_list_response = session_client.get(issue_detail_list_url(workspace.slug, project.id))
        workspace_list_response = session_client.get(workspace_issue_list_url(workspace.slug))
        search_response = session_client.get(
            global_search_url(workspace.slug),
            {"search": pipeline_item.child_issue.name, "workspace_search": "true"},
        )
        include_response = session_client.get(
            issue_list_url(workspace.slug, project.id), {"include_pipeline_items": "true"}
        )
        detail_response = session_client.get(issue_detail_url(workspace.slug, project.id, pipeline_item.child_issue_id))

        assert list_response.status_code == status.HTTP_200_OK
        assert detail_list_response.status_code == status.HTTP_200_OK
        assert workspace_list_response.status_code == status.HTTP_200_OK
        assert search_response.status_code == status.HTTP_200_OK
        assert include_response.status_code == status.HTTP_200_OK
        assert detail_response.status_code == status.HTTP_200_OK
        assert find_id_in_payload(list_response.data, pipeline_item.child_issue_id) is False
        assert find_id_in_payload(detail_list_response.data, pipeline_item.child_issue_id) is False
        assert find_id_in_payload(workspace_list_response.data, pipeline_item.child_issue_id) is False
        assert find_id_in_payload(search_response.data, pipeline_item.child_issue_id) is False
        assert find_id_in_payload(include_response.data, pipeline_item.child_issue_id) is True
        assert str(detail_response.data["id"]) == str(pipeline_item.child_issue_id)

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
    def test_manual_parent_backward_move_keeps_completion_history_and_sets_active(
        self, session_client, workspace, project, project_states, parent_issue
    ):
        session_client.post(pipeline_initialize_url(workspace.slug, project.id, parent_issue.id), {}, format="json")
        session_client.patch(
            issue_detail_url(workspace.slug, project.id, parent_issue.id),
            {"state_id": str(project_states[2].id)},
            format="json",
        )
        completed_item = IssuePipelineItem.objects.get(parent_issue=parent_issue, pipeline_state=project_states[1])
        completed_at = completed_item.completed_at

        response = session_client.patch(
            issue_detail_url(workspace.slug, project.id, parent_issue.id),
            {"state_id": str(project_states[1].id)},
            format="json",
        )

        completed_item.refresh_from_db()
        editing = IssuePipelineItem.objects.get(parent_issue=parent_issue, pipeline_state=project_states[2])
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert completed_item.status == IssuePipelineItem.StatusChoices.ACTIVE
        assert completed_item.completed_at == completed_at
        assert editing.status == IssuePipelineItem.StatusChoices.PENDING

    @pytest.mark.django_db
    def test_due_date_validation_rejects_child_date_after_parent(self, session_client, workspace, project, parent_issue):
        session_client.post(pipeline_initialize_url(workspace.slug, project.id, parent_issue.id), {}, format="json")
        pipeline_item = IssuePipelineItem.objects.filter(parent_issue=parent_issue).first()

        response = session_client.patch(
            issue_detail_url(workspace.slug, project.id, pipeline_item.child_issue_id),
            {"target_date": str(parent_issue.target_date + timedelta(days=1))},
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    @pytest.mark.django_db
    def test_bulk_due_date_validation_rejects_parent_date_before_child(
        self, session_client, workspace, project, parent_issue
    ):
        session_client.post(pipeline_initialize_url(workspace.slug, project.id, parent_issue.id), {}, format="json")
        pipeline_item = IssuePipelineItem.objects.filter(parent_issue=parent_issue).first()
        pipeline_item.child_issue.target_date = date.today() + timedelta(days=10)
        pipeline_item.child_issue.save()

        response = session_client.post(
            issue_dates_url(workspace.slug, project.id),
            {"updates": [{"id": str(parent_issue.id), "target_date": str(date.today() + timedelta(days=5))}]},
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
