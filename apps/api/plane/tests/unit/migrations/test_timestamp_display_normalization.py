# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from importlib import import_module
from unittest.mock import Mock


def test_timestamp_display_migration_normalizes_only_invalid_values():
    queryset = Mock()
    profile = Mock()
    profile.objects.exclude.return_value = queryset
    apps = Mock()
    apps.get_model.return_value = profile

    migration = import_module("plane.db.migrations.0138_normalize_profile_timestamp_display")
    migration.normalize_timestamp_display(apps, None)

    apps.get_model.assert_called_once_with("db", "Profile")
    profile.objects.exclude.assert_called_once_with(timestamp_display__in=("exact", "relative"))
    queryset.update.assert_called_once_with(timestamp_display="exact")
