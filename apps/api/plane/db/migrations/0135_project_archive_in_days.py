# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("db", "0134_workspace_group_notification_rule")]

    operations = [
        migrations.AddField(
            model_name="project",
            name="archive_in_days",
            field=models.IntegerField(blank=True, null=True, validators=[MinValueValidator(7), MaxValueValidator(365)]),
        ),
    ]
