# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

import re

from rest_framework import serializers

from plane.app.serializers.base import BaseSerializer
from plane.app.serializers.user import UserAdminLiteSerializer
from plane.db.models import (
    Project,
    State,
    WorkspaceGroup,
    WorkspaceGroupMember,
    WorkspaceGroupNotificationRule,
    WorkspaceMember,
)


HEX_COLOR_RE = re.compile(r"^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$")


class WorkspaceGroupWorkspaceMemberSerializer(BaseSerializer):
    member = UserAdminLiteSerializer(read_only=True)

    class Meta:
        model = WorkspaceMember
        fields = ["id", "member", "role", "is_active"]
        read_only_fields = fields


class WorkspaceGroupMemberSerializer(BaseSerializer):
    workspace_member = WorkspaceGroupWorkspaceMemberSerializer(read_only=True)

    class Meta:
        model = WorkspaceGroupMember
        fields = [
            "id",
            "workspace_id",
            "group_id",
            "workspace_member",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "workspace_id", "group_id", "workspace_member", "created_at", "updated_at"]


class WorkspaceGroupMemberCreateSerializer(BaseSerializer):
    workspace_member_id = serializers.UUIDField(write_only=True)

    class Meta:
        model = WorkspaceGroupMember
        fields = ["workspace_member_id"]

    def validate_workspace_member_id(self, value):
        workspace_id = self.context.get("workspace_id")
        group_id = self.context.get("group_id")

        try:
            workspace_member = WorkspaceMember.objects.get(id=value, workspace_id=workspace_id, is_active=True)
        except WorkspaceMember.DoesNotExist:
            raise serializers.ValidationError("WORKSPACE_MEMBER_NOT_FOUND")

        if WorkspaceGroupMember.objects.filter(
            group_id=group_id,
            workspace_member_id=workspace_member.id,
        ).exists():
            raise serializers.ValidationError("GROUP_MEMBER_ALREADY_EXISTS")

        self.context["workspace_member"] = workspace_member
        return value

    def create(self, validated_data):
        workspace_member = self.context["workspace_member"]
        return WorkspaceGroupMember.objects.create(
            workspace_id=self.context["workspace_id"],
            group_id=self.context["group_id"],
            workspace_member=workspace_member,
        )


class WorkspaceGroupSerializer(BaseSerializer):
    member_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = WorkspaceGroup
        fields = [
            "id",
            "workspace_id",
            "name",
            "slug",
            "description",
            "color",
            "emoji",
            "sort_order",
            "is_archived",
            "member_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "workspace_id", "slug", "member_count", "created_at", "updated_at"]

    def validate_name(self, value):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("GROUP_NAME_REQUIRED")

        workspace_id = self.context.get("workspace_id")
        queryset = WorkspaceGroup.objects.filter(workspace_id=workspace_id, name__iexact=value, is_archived=False)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)

        if queryset.exists():
            raise serializers.ValidationError("GROUP_NAME_ALREADY_EXISTS")

        return value

    def validate_color(self, value):
        if value in (None, ""):
            return value

        value = value.strip()
        if not HEX_COLOR_RE.match(value):
            raise serializers.ValidationError("INVALID_GROUP_COLOR")

        return value

    def validate_emoji(self, value):
        if value in (None, ""):
            return value

        value = value.strip()
        if len(value) > 64:
            raise serializers.ValidationError("INVALID_GROUP_EMOJI")

        return value


class WorkspaceGroupNotificationRuleSerializer(BaseSerializer):
    class Meta:
        model = WorkspaceGroupNotificationRule
        fields = [
            "id",
            "workspace_id",
            "group_id",
            "project_id",
            "state_id",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class WorkspaceGroupNotificationRuleUpdateSerializer(serializers.Serializer):
    project_id = serializers.UUIDField()
    state_ids = serializers.ListField(child=serializers.UUIDField(), allow_empty=True)

    def validate(self, attrs):
        workspace_id = self.context.get("workspace_id")
        group_id = self.context.get("group_id")
        project_id = attrs.get("project_id")
        state_ids = list(dict.fromkeys(attrs.get("state_ids") or []))

        if not Project.objects.filter(id=project_id, workspace_id=workspace_id, archived_at__isnull=True).exists():
            raise serializers.ValidationError({"project_id": "PROJECT_NOT_FOUND"})

        if state_ids:
            valid_state_ids = set(
                State.objects.filter(
                    id__in=state_ids,
                    workspace_id=workspace_id,
                    project_id=project_id,
                ).values_list("id", flat=True)
            )
            invalid_state_ids = [str(state_id) for state_id in state_ids if state_id not in valid_state_ids]
            if invalid_state_ids:
                raise serializers.ValidationError({"state_ids": "INVALID_STATE_IDS"})

        attrs["state_ids"] = state_ids
        attrs["group_id"] = group_id
        attrs["workspace_id"] = workspace_id
        return attrs
