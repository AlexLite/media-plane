# Generated for Plane RU custom build.

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("db", "0121_alter_estimate_type"),
    ]

    operations = [
        migrations.AddField(
            model_name="issue",
            name="target_time",
            field=models.TimeField(blank=True, null=True),
        ),
    ]
