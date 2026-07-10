# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from unittest.mock import Mock

import pytest

from plane.authentication.adapter.error import AuthenticationException
from plane.authentication.provider.oauth.github import GitHubOAuthProvider


@pytest.mark.unit
def test_organization_membership_failure_does_not_log_github_identity():
    provider = object.__new__(GitHubOAuthProvider)
    provider.organization_id = "private-organization"
    provider.token_data = {"access_token": "private-token"}
    provider.logger = Mock()
    provider.get_user_response = Mock(return_value={"login": "private-login"})
    provider.is_user_in_organization = Mock(return_value=False)

    with pytest.raises(AuthenticationException):
        provider.set_user_data()

    provider.logger.warning.assert_called_once_with("GitHub organization membership validation failed")
