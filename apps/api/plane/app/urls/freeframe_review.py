# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from django.urls import path

from plane.app.views.issue.freeframe_review import FreeFrameReviewSessionEndpoint
from plane.app.views.issue.freeframe_review_catalog import (
    FreeFrameReviewCatalogEndpoint,
)


urlpatterns = [
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/issues/<uuid:issue_id>/freeframe-review-session/",
        FreeFrameReviewSessionEndpoint.as_view(),
        name="freeframe-review-session",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/issues/<uuid:issue_id>/freeframe-review-assets/",
        FreeFrameReviewCatalogEndpoint.as_view(),
        name="freeframe-review-assets",
    ),
]
