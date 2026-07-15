# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from types import SimpleNamespace
from unittest.mock import patch
from uuid import uuid4

from rest_framework import status

from plane.app.urls.freeframe_review import urlpatterns
from plane.app.views.issue.freeframe_review_catalog import (
    FreeFrameReviewCatalogEndpoint,
)


def _request(*, query_params=None, data=None):
    return SimpleNamespace(
        user=SimpleNamespace(id=uuid4(), email="admin@plane.test", full_name="Admin"),
        query_params=query_params or {},
        data=data or {},
    )


def test_catalog_requires_review_manage_before_calling_freeframe():
    endpoint = FreeFrameReviewCatalogEndpoint()
    request = _request()

    with (
        patch(
            "plane.app.views.issue.freeframe_review_catalog._review_scopes",
            return_value=["review:read"],
        ),
        patch(
            "plane.app.views.issue.freeframe_review_catalog._freeframe_request",
        ) as freeframe_request,
    ):
        response = endpoint.get(request, "workspace", uuid4(), uuid4())

    assert response.status_code == status.HTTP_403_FORBIDDEN
    freeframe_request.assert_not_called()


def test_catalog_get_exchanges_session_and_forwards_bounded_search():
    endpoint = FreeFrameReviewCatalogEndpoint()
    request = _request(query_params={"q": " campaign cut ", "limit": "12"})
    issue = SimpleNamespace(id=uuid4())
    assets = [{"id": str(uuid4()), "name": "Campaign cut"}]

    with (
        patch(
            "plane.app.views.issue.freeframe_review_catalog._review_scopes",
            return_value=["review:read", "review:manage"],
        ),
        patch(
            "plane.app.views.issue.freeframe_review_catalog._issue",
            return_value=issue,
        ),
        patch(
            "plane.app.views.issue.freeframe_review_catalog._mint_integration_token",
            return_value=("integration-token", 300),
        ),
        patch(
            "plane.app.views.issue.freeframe_review_catalog._exchange_freeframe_session",
            return_value="scoped-access-token",
        ) as exchange_session,
        patch(
            "plane.app.views.issue.freeframe_review_catalog._freeframe_request",
            return_value=assets,
        ) as freeframe_request,
    ):
        response = endpoint.get(request, "workspace", uuid4(), uuid4())

    assert response.status_code == status.HTTP_200_OK
    assert response.data == assets
    assert response["Cache-Control"] == "no-store, private"
    exchange_session.assert_called_once_with("integration-token")
    assert freeframe_request.call_args.args == (
        "GET",
        "/integrations/plane/catalog/assets?limit=12&q=campaign+cut",
    )
    assert freeframe_request.call_args.kwargs == {
        "access_token": "scoped-access-token"
    }


def test_catalog_rejects_invalid_limit_without_upstream_request():
    endpoint = FreeFrameReviewCatalogEndpoint()
    request = _request(query_params={"limit": "101"})

    with (
        patch(
            "plane.app.views.issue.freeframe_review_catalog._catalog_context",
            return_value=("scoped-access-token", None),
        ),
        patch(
            "plane.app.views.issue.freeframe_review_catalog._freeframe_request",
        ) as freeframe_request,
    ):
        response = endpoint.get(request, "workspace", uuid4(), uuid4())

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    freeframe_request.assert_not_called()


def test_catalog_post_normalizes_and_forwards_new_asset():
    endpoint = FreeFrameReviewCatalogEndpoint()
    request = _request(
        data={
            "name": "  Campaign cut  ",
            "description": "  First review  ",
            "asset_type": "video",
        }
    )
    created = {
        "id": str(uuid4()),
        "name": "Campaign cut",
        "asset_type": "video",
    }

    with (
        patch(
            "plane.app.views.issue.freeframe_review_catalog._catalog_context",
            return_value=("scoped-access-token", None),
        ),
        patch(
            "plane.app.views.issue.freeframe_review_catalog._freeframe_request",
            return_value=created,
        ) as freeframe_request,
    ):
        response = endpoint.post(request, "workspace", uuid4(), uuid4())

    assert response.status_code == status.HTTP_201_CREATED
    assert response.data == created
    assert freeframe_request.call_args.args == (
        "POST",
        "/integrations/plane/catalog/assets",
    )
    assert freeframe_request.call_args.kwargs == {
        "payload": {
            "name": "Campaign cut",
            "description": "First review",
            "asset_type": "video",
        },
        "access_token": "scoped-access-token",
    }


def test_catalog_post_rejects_unsupported_asset_type():
    endpoint = FreeFrameReviewCatalogEndpoint()
    request = _request(data={"name": "Cut", "asset_type": "document"})

    with patch(
        "plane.app.views.issue.freeframe_review_catalog._catalog_context",
    ) as catalog_context:
        response = endpoint.post(request, "workspace", uuid4(), uuid4())

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    catalog_context.assert_not_called()


def test_catalog_routes_are_registered():
    names = {pattern.name for pattern in urlpatterns}

    assert "freeframe-review-session" in names
    assert "freeframe-review-assets" in names
