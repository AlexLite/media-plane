# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from django.db import transaction
from django.utils.dateparse import parse_date, parse_time
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response

from plane.app.permissions import ROLE, allow_permission
from plane.app.serializers import IssuePipelineItemSerializer
from plane.db.models import Issue, IssuePipelineItem, State

from .. import BaseAPIView


def get_issue_pipeline_queryset(slug, project_id, issue_id):
    return (
        IssuePipelineItem.objects.filter(
            workspace__slug=slug,
            project_id=project_id,
            parent_issue_id=issue_id,
        )
        .select_related("pipeline_state", "completed_by")
        .order_by("sort_order", "created_at")
    )


def parse_pipeline_date(value):
    if value in ("", None):
        return None
    if hasattr(value, "year"):
        return value
    return parse_date(value)


def parse_pipeline_time(value):
    if value in ("", None):
        return None
    if hasattr(value, "hour"):
        return value
    return parse_time(value)


def validate_pipeline_item_dates(item, start_date, target_date):
    if start_date and target_date and start_date > target_date:
        return "Start date cannot exceed target date"

    parent_target_date = item.parent_issue.target_date
    if target_date and parent_target_date and target_date > parent_target_date:
        return "Pipeline item target date cannot be later than the parent issue target date"

    previous_item = (
        IssuePipelineItem.objects.filter(
            parent_issue_id=item.parent_issue_id,
            sort_order__lt=item.sort_order,
        )
        .exclude(pk=item.pk)
        .order_by("-sort_order", "-created_at")
        .first()
    )
    if previous_item and previous_item.target_date and start_date and start_date < previous_item.target_date:
        return "Pipeline item start date cannot be earlier than the previous item target date"

    next_item = (
        IssuePipelineItem.objects.filter(
            parent_issue_id=item.parent_issue_id,
            sort_order__gt=item.sort_order,
        )
        .exclude(pk=item.pk)
        .order_by("sort_order", "created_at")
        .first()
    )
    if next_item and next_item.start_date and target_date and target_date > next_item.start_date:
        return "Pipeline item target date cannot be later than the next item start date"

    return None


def sync_issue_pipeline_for_parent_state(parent_issue, actor):
    pipeline_items = list(
        IssuePipelineItem.objects.filter(parent_issue=parent_issue)
        .select_related("pipeline_state")
        .order_by("sort_order", "created_at")
    )
    if not pipeline_items or not parent_issue.state_id:
        return

    active_index = next(
        (index for index, item in enumerate(pipeline_items) if item.pipeline_state_id == parent_issue.state_id),
        None,
    )
    if active_index is None:
        return

    now = timezone.now()
    updates = []
    for index, item in enumerate(pipeline_items):
        next_status = item.status
        next_auto_completed = item.auto_completed
        next_completed_by_id = item.completed_by_id
        next_completed_at = item.completed_at

        if index < active_index:
            if item.status != IssuePipelineItem.StatusChoices.COMPLETED:
                next_status = IssuePipelineItem.StatusChoices.COMPLETED
                next_auto_completed = True
                next_completed_by_id = actor.id if actor and actor.is_authenticated else None
                next_completed_at = now
        elif index == active_index:
            next_status = IssuePipelineItem.StatusChoices.ACTIVE
            next_auto_completed = False
            next_completed_by_id = None
            next_completed_at = None
        else:
            if item.status == IssuePipelineItem.StatusChoices.ACTIVE:
                next_status = IssuePipelineItem.StatusChoices.PENDING

        if (
            next_status != item.status
            or next_auto_completed != item.auto_completed
            or next_completed_by_id != item.completed_by_id
            or next_completed_at != item.completed_at
        ):
            item.status = next_status
            item.auto_completed = next_auto_completed
            item.completed_by_id = next_completed_by_id
            item.completed_at = next_completed_at
            updates.append(item)

    if updates:
        IssuePipelineItem.objects.bulk_update(
            updates,
            ["status", "auto_completed", "completed_by", "completed_at"],
            batch_size=20,
        )


class IssuePipelineEndpoint(BaseAPIView):
    @allow_permission([ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST])
    def get(self, request, slug, project_id, issue_id):
        pipeline_items = get_issue_pipeline_queryset(slug, project_id, issue_id)
        return Response(IssuePipelineItemSerializer(pipeline_items, many=True).data, status=status.HTTP_200_OK)

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER])
    @transaction.atomic
    def post(self, request, slug, project_id, issue_id):
        parent_issue = Issue.objects.select_for_update(of=("self",)).filter(
            workspace__slug=slug,
            project_id=project_id,
            pk=issue_id,
        ).first()
        if not parent_issue:
            return Response({"error": "Issue not found"}, status=status.HTTP_404_NOT_FOUND)
        if parent_issue.parent_id:
            return Response({"error": "Pipeline can only be initialized on a parent issue"}, status=status.HTTP_400_BAD_REQUEST)

        existing_items = get_issue_pipeline_queryset(slug, project_id, issue_id)
        if existing_items.exists():
            return Response(IssuePipelineItemSerializer(existing_items, many=True).data, status=status.HTTP_200_OK)

        states = list(
            State.objects.filter(project_id=project_id, is_pipeline_enabled=True).order_by("sequence", "created_at")
        )
        if not states:
            return Response({"error": "Project has no pipeline states"}, status=status.HTTP_400_BAD_REQUEST)

        active_index = next((index for index, state in enumerate(states) if state.id == parent_issue.state_id), 0)
        created_items = []
        for index, state in enumerate(states):
            if index < active_index:
                item_status = IssuePipelineItem.StatusChoices.COMPLETED
                completed_at = timezone.now()
                completed_by = request.user
                auto_completed = True
            elif index == active_index:
                item_status = IssuePipelineItem.StatusChoices.ACTIVE
                completed_at = None
                completed_by = None
                auto_completed = False
            else:
                item_status = IssuePipelineItem.StatusChoices.PENDING
                completed_at = None
                completed_by = None
                auto_completed = False

            created_items.append(
                IssuePipelineItem(
                    project_id=project_id,
                    workspace_id=parent_issue.workspace_id,
                    parent_issue=parent_issue,
                    pipeline_state=state,
                    state_name_snapshot=state.name,
                    name=state.name,
                    sort_order=state.sequence,
                    status=item_status,
                    hidden_from_board=True,
                    auto_completed=auto_completed,
                    completed_by=completed_by,
                    completed_at=completed_at,
                )
            )

        IssuePipelineItem.objects.bulk_create(created_items, batch_size=20)
        pipeline_items = get_issue_pipeline_queryset(slug, project_id, issue_id)
        return Response(IssuePipelineItemSerializer(pipeline_items, many=True).data, status=status.HTTP_201_CREATED)


class IssuePipelineItemEndpoint(BaseAPIView):
    @allow_permission([ROLE.ADMIN, ROLE.MEMBER])
    @transaction.atomic
    def patch(self, request, slug, project_id, issue_id, pipeline_item_id):
        item = IssuePipelineItem.objects.select_for_update().filter(
            workspace__slug=slug,
            project_id=project_id,
            parent_issue_id=issue_id,
            pk=pipeline_item_id,
        ).first()
        if not item:
            return Response({"error": "Pipeline item not found"}, status=status.HTTP_404_NOT_FOUND)

        allowed_fields = {"name", "start_date", "target_date", "target_time", "assignee_ids", "hidden_from_board"}
        if "status" in request.data and request.data["status"] not in IssuePipelineItem.StatusChoices.values:
            return Response({"error": "Invalid pipeline item status"}, status=status.HTTP_400_BAD_REQUEST)

        next_start_date = parse_pipeline_date(request.data["start_date"]) if "start_date" in request.data else item.start_date
        next_target_date = (
            parse_pipeline_date(request.data["target_date"]) if "target_date" in request.data else item.target_date
        )
        if ("start_date" in request.data and request.data["start_date"] not in ("", None) and not next_start_date) or (
            "target_date" in request.data and request.data["target_date"] not in ("", None) and not next_target_date
        ):
            return Response({"error": "Invalid pipeline item date"}, status=status.HTTP_400_BAD_REQUEST)

        date_error = validate_pipeline_item_dates(item, next_start_date, next_target_date)
        if date_error:
            return Response({"error": date_error}, status=status.HTTP_400_BAD_REQUEST)

        for field in allowed_fields:
            if field in request.data:
                if field in {"start_date", "target_date"}:
                    setattr(item, field, parse_pipeline_date(request.data[field]))
                elif field == "target_time":
                    next_target_time = parse_pipeline_time(request.data[field])
                    if request.data[field] not in ("", None) and not next_target_time:
                        return Response({"error": "Invalid pipeline item target time"}, status=status.HTTP_400_BAD_REQUEST)
                    setattr(item, field, next_target_time)
                elif field == "assignee_ids":
                    setattr(item, field, request.data[field] or [])
                else:
                    setattr(item, field, request.data[field])
        item.save()
        return Response(IssuePipelineItemSerializer(item).data, status=status.HTTP_200_OK)


class IssuePipelineCompleteEndpoint(BaseAPIView):
    @allow_permission([ROLE.ADMIN, ROLE.MEMBER])
    @transaction.atomic
    def post(self, request, slug, project_id, issue_id, pipeline_item_id):
        parent_issue = Issue.objects.select_for_update(of=("self",)).filter(
            workspace__slug=slug,
            project_id=project_id,
            pk=issue_id,
        ).first()
        if not parent_issue:
            return Response({"error": "Issue not found"}, status=status.HTTP_404_NOT_FOUND)

        pipeline_items = list(
            IssuePipelineItem.objects.select_for_update()
            .filter(parent_issue=parent_issue)
            .order_by("sort_order", "created_at")
        )
        item_index = next((index for index, item in enumerate(pipeline_items) if str(item.id) == str(pipeline_item_id)), None)
        if item_index is None:
            return Response({"error": "Pipeline item not found"}, status=status.HTTP_404_NOT_FOUND)

        item = pipeline_items[item_index]
        if item.status != IssuePipelineItem.StatusChoices.ACTIVE:
            return Response(
                {"error": "Only the active pipeline step can be completed"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        now = timezone.now()
        item.status = IssuePipelineItem.StatusChoices.COMPLETED
        item.completed_by = request.user
        item.completed_at = now
        item.auto_completed = False
        item.hidden_from_board = True
        item.save(update_fields=["status", "completed_by", "completed_at", "auto_completed", "hidden_from_board"])

        next_item = pipeline_items[item_index + 1] if item_index + 1 < len(pipeline_items) else None
        if next_item:
            next_item.status = IssuePipelineItem.StatusChoices.ACTIVE
            next_item.auto_completed = False
            next_item.completed_by = None
            next_item.completed_at = None
            next_item.hidden_from_board = True
            next_item.save(update_fields=["status", "auto_completed", "completed_by", "completed_at", "hidden_from_board"])
            if next_item.pipeline_state_id:
                parent_issue.state_id = next_item.pipeline_state_id
                parent_issue.save(update_fields=["state", "updated_at"])

        pipeline_items = get_issue_pipeline_queryset(slug, project_id, issue_id)
        return Response(
            {
                "parent_issue_id": str(parent_issue.id),
                "parent_state_id": str(parent_issue.state_id) if parent_issue.state_id else None,
                "pipeline_items": IssuePipelineItemSerializer(pipeline_items, many=True).data,
            },
            status=status.HTTP_200_OK,
        )
