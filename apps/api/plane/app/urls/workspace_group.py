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
        WorkspaceGroupListCreateAPIEndpoint.as_view(),
        name="workspace-groups",
    ),
    path(
        "workspaces/<str:slug>/groups/<uuid:pk>/",
        WorkspaceGroupDetailAPIEndpoint.as_view(),
        name="workspace-group-detail",
    ),

    path(
        "workspaces/<str:slug>/groups/<uuid:group_id>/notification-rules/",
        WorkspaceGroupNotificationRuleAPIEndpoint.as_view(),
        name="workspace-group-notification-rules",
    ),
    path(
        "workspaces/<str:slug>/groups/<uuid:group_id>/members/",
        WorkspaceGroupMemberListCreateAPIEndpoint.as_view(),
        name="workspace-group-members",
    ),
    path(
        "workspaces/<str:slug>/groups/<uuid:group_id>/members/<uuid:pk>/",
        WorkspaceGroupMemberDetailAPIEndpoint.as_view(),
        name="workspace-group-member-detail",
    ),
]
