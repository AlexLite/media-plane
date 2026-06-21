# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("db", "0122_issue_target_time"),
    ]

    operations = [
        migrations.AddField(
            model_name="module",
            name="start_time",
            field=models.TimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="module",
            name="target_time",
            field=models.TimeField(blank=True, null=True),
        ),
    ]
