# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

import pytest


@pytest.fixture(autouse=True)
def configured_freeframe_review_environment(monkeypatch):
    monkeypatch.setenv("FREEFRAME_REVIEW_JWT_SECRET", "plane-freeframe-test-secret")
    monkeypatch.setenv("FREEFRAME_REVIEW_API_URL", "http://freeframe-api:8000")
    monkeypatch.setenv("FREEFRAME_REVIEW_PUBLIC_API_URL", "https://freeframe.example.test/api/")
