# Generated for pipeline item comments

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("db", "0130_pipeline_item_native_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="issuecomment",
            name="pipeline_item",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="comments",
                to="db.issuepipelineitem",
            ),
        ),
    ]
