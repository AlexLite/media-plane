# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from django.urls import path

from plane.app.views.issue.freeframe_review_catalog import (
    FreeFrameReviewCatalogEndpoint,
)
from plane.app.views.issue.freeframe_review_public import (
    FreeFrameReviewPublicSessionEndpoint,
)


urlpatterns = [
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/issues/<uuid:issue_id>/freeframe-review-session/",
        FreeFrameReviewPublicSessionEndpoint.as_view(),
        name="freeframe-review-session",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/issues/<uuid:issue_id>/freeframe-review-assets/",
        FreeFrameReviewCatalogEndpoint.as_view(),
        name="freeframe-review-assets",
    ),
]
