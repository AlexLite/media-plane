from django.contrib.postgres.fields import ArrayField
from django.db import migrations, models
import django.db.models.deletion


def copy_child_issue_fields(apps, schema_editor):
    IssuePipelineItem = apps.get_model("db", "IssuePipelineItem")

    for item in IssuePipelineItem.objects.select_related("child_issue").all().iterator():
        child_issue = item.child_issue
        if child_issue:
            item.name = child_issue.name or item.state_name_snapshot
            item.start_date = child_issue.start_date
            item.target_date = child_issue.target_date
            item.target_time = child_issue.target_time
            item.assignee_ids = list(
                child_issue.issue_assignee.filter(deleted_at__isnull=True).values_list("assignee_id", flat=True)
            )
        else:
            item.name = item.state_name_snapshot
            item.assignee_ids = []
        item.save(update_fields=["name", "start_date", "target_date", "target_time", "assignee_ids"])


class Migration(migrations.Migration):
    dependencies = [
        ("db", "0129_state_is_pipeline_enabled"),
    ]

    operations = [
        migrations.AlterField(
            model_name="issuepipelineitem",
            name="child_issue",
            field=models.OneToOneField(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="pipeline_metadata",
                to="db.issue",
            ),
        ),
        migrations.AddField(
            model_name="issuepipelineitem",
            name="name",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="issuepipelineitem",
            name="start_date",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="issuepipelineitem",
            name="target_date",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="issuepipelineitem",
            name="target_time",
            field=models.TimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="issuepipelineitem",
            name="assignee_ids",
            field=ArrayField(base_field=models.UUIDField(), blank=True, default=list, size=None),
        ),
        migrations.RunPython(copy_child_issue_fields, migrations.RunPython.noop),
    ]
