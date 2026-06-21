# Generated for configurable issue pipeline states.

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("db", "0128_issue_pipeline_item"),
    ]

    operations = [
        migrations.AddField(
            model_name="state",
            name="is_pipeline_enabled",
            field=models.BooleanField(default=False),
        ),
    ]
