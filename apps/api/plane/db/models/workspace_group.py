# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from django.db import models
from django.db.models import Q
from django.utils.text import slugify

from .base import BaseModel


class WorkspaceGroup(BaseModel):
    workspace = models.ForeignKey("db.Workspace", on_delete=models.CASCADE, related_name="workspace_groups")
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255)
    description = models.TextField(null=True, blank=True)
    color = models.CharField(max_length=255, null=True, blank=True)
    emoji = models.CharField(max_length=64, null=True, blank=True)
    sort_order = models.FloatField(null=True, blank=True)
    is_archived = models.BooleanField(default=False)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["workspace", "name"],
                condition=Q(deleted_at__isnull=True, is_archived=False),
                name="workspace_group_unique_name_workspace_active",
            ),
            models.UniqueConstraint(
                fields=["workspace", "slug"],
                condition=Q(deleted_at__isnull=True, is_archived=False),
                name="workspace_group_unique_slug_workspace_active",
            ),
        ]
        verbose_name = "Workspace Group"
        verbose_name_plural = "Workspace Groups"
        db_table = "workspace_groups"
        ordering = ("sort_order", "name", "created_at")

    def _generate_unique_slug(self):
        base_slug = slugify(self.name, allow_unicode=True) or "group"
        slug = base_slug
        index = 2
        queryset = WorkspaceGroup.objects.filter(workspace_id=self.workspace_id, slug=slug, is_archived=False)
        if self.pk:
            queryset = queryset.exclude(pk=self.pk)

        while queryset.exists():
            slug = f"{base_slug}-{index}"
            queryset = WorkspaceGroup.objects.filter(workspace_id=self.workspace_id, slug=slug, is_archived=False)
            if self.pk:
                queryset = queryset.exclude(pk=self.pk)
            index += 1

        return slug

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = self._generate_unique_slug()

        if self.sort_order is None:
            largest = WorkspaceGroup.objects.filter(workspace_id=self.workspace_id).aggregate(
                largest=models.Max("sort_order")
            )["largest"]
            self.sort_order = (largest + 10000) if largest is not None else 10000

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} <{self.workspace_id}>"


class WorkspaceGroupMember(BaseModel):
    workspace = models.ForeignKey("db.Workspace", on_delete=models.CASCADE, related_name="workspace_group_members")
    group = models.ForeignKey(WorkspaceGroup, on_delete=models.CASCADE, related_name="group_members")
    workspace_member = models.ForeignKey(
        "db.WorkspaceMember",
        on_delete=models.CASCADE,
        related_name="workspace_group_members",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["group", "workspace_member"],
                condition=Q(deleted_at__isnull=True),
                name="workspace_group_member_unique_group_member_active",
            ),
        ]
        verbose_name = "Workspace Group Member"
        verbose_name_plural = "Workspace Group Members"
        db_table = "workspace_group_members"
        ordering = ("created_at",)

    def __str__(self):
        return f"{self.workspace_member_id} <{self.group_id}>"


class WorkspaceGroupNotificationRule(BaseModel):
    workspace = models.ForeignKey(
        "db.Workspace", on_delete=models.CASCADE, related_name="workspace_group_notification_rules"
    )
    group = models.ForeignKey(
        WorkspaceGroup, on_delete=models.CASCADE, related_name="notification_rules"
    )
    project = models.ForeignKey(
        "db.Project", on_delete=models.CASCADE, related_name="workspace_group_notification_rules"
    )
    state = models.ForeignKey(
        "db.State", on_delete=models.CASCADE, related_name="workspace_group_notification_rules"
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["group", "project", "state"],
                condition=Q(deleted_at__isnull=True),
                name="workspace_group_notification_rule_unique_active",
            ),
        ]
        verbose_name = "Workspace Group Notification Rule"
        verbose_name_plural = "Workspace Group Notification Rules"
        db_table = "workspace_group_notification_rules"
        ordering = ("project_id", "state__sequence", "created_at")

    def __str__(self):
        return f"{self.group_id} <{self.project_id}:{self.state_id}>"
