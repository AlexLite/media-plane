# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from django.urls import path

from plane.api.views import (
    WorkspaceGroupDetailAPIEndpoint,
    WorkspaceGroupListCreateAPIEndpoint,
    WorkspaceGroupMemberDetailAPIEndpoint,
    WorkspaceGroupMemberListCreateAPIEndpoint,
    WorkspaceGroupNotificationRuleAPIEndpoint,
)


urlpatterns = [
    path(
        "workspaces/<str:slug>/groups/",
        WorkspaceGroupListCreateAPIEndpoint.as_view(http_method_names=["get", "post"]),
        name="workspace-groups",
    ),
    path(
        "workspaces/<str:slug>/groups/<uuid:pk>/",
        WorkspaceGroupDetailAPIEndpoint.as_view(http_method_names=["get", "patch", "delete"]),
        name="workspace-groups",
    ),

    path(
        "workspaces/<str:slug>/groups/<uuid:group_id>/notification-rules/",
        WorkspaceGroupNotificationRuleAPIEndpoint.as_view(http_method_names=["get", "put"]),
        name="workspace-group-notification-rules",
    ),
    path(
        "workspaces/<str:slug>/groups/<uuid:group_id>/members/",
        WorkspaceGroupMemberListCreateAPIEndpoint.as_view(http_method_names=["get", "post"]),
        name="workspace-group-members",
    ),
    path(
        "workspaces/<str:slug>/groups/<uuid:group_id>/members/<uuid:pk>/",
        WorkspaceGroupMemberDetailAPIEndpoint.as_view(http_method_names=["delete"]),
        name="workspace-group-member-detail",
    ),
]
