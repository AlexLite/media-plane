# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from django.db import IntegrityError
from django.db.models import Count, Q
from rest_framework import status
from rest_framework.response import Response

from plane.app.permissions import WorkspaceEntityPermission
from plane.app.serializers import (
    WorkspaceGroupMemberCreateSerializer,
    WorkspaceGroupMemberSerializer,
    WorkspaceGroupNotificationRuleSerializer,
    WorkspaceGroupNotificationRuleUpdateSerializer,
    WorkspaceGroupSerializer,
)
from plane.app.views.base import BaseAPIView
from plane.db.models import Workspace, WorkspaceGroup, WorkspaceGroupMember, WorkspaceGroupNotificationRule


class WorkspaceGroupListCreateAPIEndpoint(BaseAPIView):
    serializer_class = WorkspaceGroupSerializer
    model = WorkspaceGroup
    permission_classes = [WorkspaceEntityPermission]
    use_read_replica = True

    def get_workspace(self, slug):
        return Workspace.objects.get(slug=slug)

    def get_queryset(self):
        return (
            WorkspaceGroup.objects.filter(workspace__slug=self.kwargs.get("slug"), is_archived=False)
            .select_related("workspace")
            .annotate(member_count=Count("group_members", filter=Q(group_members__deleted_at__isnull=True)))
        )

    def get(self, request, slug):
        groups = self.get_queryset().order_by("sort_order", "name", "created_at")
        serializer = WorkspaceGroupSerializer(groups, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, slug):
        workspace = self.get_workspace(slug)
        serializer = WorkspaceGroupSerializer(data=request.data, context={"workspace_id": workspace.id})
        if serializer.is_valid():
            try:
                serializer.save(workspace=workspace)
            except IntegrityError:
                return Response({"error": "GROUP_NAME_ALREADY_EXISTS"}, status=status.HTTP_409_CONFLICT)
            return Response(WorkspaceGroupSerializer(serializer.instance).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class WorkspaceGroupDetailAPIEndpoint(WorkspaceGroupListCreateAPIEndpoint):
    def get_object(self, pk):
        return self.get_queryset().get(pk=pk)

    def get(self, request, slug, pk):
        group = self.get_object(pk)
        serializer = WorkspaceGroupSerializer(group)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, slug, pk):
        group = self.get_object(pk)
        serializer = WorkspaceGroupSerializer(
            group,
            data=request.data,
            partial=True,
            context={"workspace_id": group.workspace_id},
        )
        if serializer.is_valid():
            try:
                serializer.save()
            except IntegrityError:
                return Response({"error": "GROUP_NAME_ALREADY_EXISTS"}, status=status.HTTP_409_CONFLICT)
            return Response(WorkspaceGroupSerializer(serializer.instance).data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, slug, pk):
        group = self.get_object(pk)
        group.is_archived = True
        group.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


class WorkspaceGroupMemberListCreateAPIEndpoint(WorkspaceGroupDetailAPIEndpoint):
    serializer_class = WorkspaceGroupMemberSerializer
    model = WorkspaceGroupMember

    def get_group(self, slug, group_id):
        return WorkspaceGroup.objects.get(workspace__slug=slug, id=group_id, is_archived=False)

    def get_member_queryset(self, slug, group_id):
        return (
            WorkspaceGroupMember.objects.filter(group_id=group_id, group__workspace__slug=slug)
            .select_related("workspace_member", "workspace_member__member", "workspace_member__member__avatar_asset")
            .order_by("workspace_member__member__display_name", "created_at")
        )

    def get(self, request, slug, group_id):
        self.get_group(slug, group_id)
        serializer = WorkspaceGroupMemberSerializer(self.get_member_queryset(slug, group_id), many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, slug, group_id):
        group = self.get_group(slug, group_id)
        serializer = WorkspaceGroupMemberCreateSerializer(
            data=request.data,
            context={"workspace_id": group.workspace_id, "group_id": group.id},
        )
        if serializer.is_valid():
            try:
                group_member = serializer.save()
            except IntegrityError:
                return Response({"error": "GROUP_MEMBER_ALREADY_EXISTS"}, status=status.HTTP_409_CONFLICT)
            return Response(WorkspaceGroupMemberSerializer(group_member).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class WorkspaceGroupMemberDetailAPIEndpoint(WorkspaceGroupMemberListCreateAPIEndpoint):
    def delete(self, request, slug, group_id, pk):
        group_member = self.get_member_queryset(slug, group_id).get(pk=pk)
        group_member.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class WorkspaceGroupNotificationRuleAPIEndpoint(WorkspaceGroupDetailAPIEndpoint):
    serializer_class = WorkspaceGroupNotificationRuleSerializer
    model = WorkspaceGroupNotificationRule

    def get_group(self, slug, group_id):
        return WorkspaceGroup.objects.get(workspace__slug=slug, id=group_id, is_archived=False)

    def get_queryset(self, slug, group_id):
        return WorkspaceGroupNotificationRule.objects.filter(
            group_id=group_id,
            group__workspace__slug=slug,
        ).select_related("workspace", "group", "project", "state")

    def get(self, request, slug, group_id):
        self.get_group(slug, group_id)
        serializer = WorkspaceGroupNotificationRuleSerializer(self.get_queryset(slug, group_id), many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request, slug, group_id):
        group = self.get_group(slug, group_id)
        serializer = WorkspaceGroupNotificationRuleUpdateSerializer(
            data=request.data,
            context={"workspace_id": group.workspace_id, "group_id": group.id},
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        project_id = serializer.validated_data["project_id"]
        state_ids = serializer.validated_data["state_ids"]

        WorkspaceGroupNotificationRule.objects.filter(group=group, project_id=project_id).delete()
        WorkspaceGroupNotificationRule.objects.bulk_create(
            [
                WorkspaceGroupNotificationRule(
                    workspace_id=group.workspace_id,
                    group=group,
                    project_id=project_id,
                    state_id=state_id,
                )
                for state_id in state_ids
            ],
            batch_size=100,
            ignore_conflicts=True,
        )

        rules = self.get_queryset(slug, group_id)
        return Response(WorkspaceGroupNotificationRuleSerializer(rules, many=True).data, status=status.HTTP_200_OK)
