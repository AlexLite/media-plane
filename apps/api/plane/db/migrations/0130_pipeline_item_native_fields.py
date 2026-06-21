# Generated for pipeline item native fields

from uuid import uuid4

from django.conf import settings
from django.contrib.postgres.fields import ArrayField
from django.db import migrations, models
import django.db.models.deletion


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
        migrations.CreateModel(
            name="IssuePipelineItem",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                        unique=True,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="Created At")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="Last Modified At")),
                ("deleted_at", models.DateTimeField(blank=True, null=True, verbose_name="Deleted At")),
                (
                    "created_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="issuepipelineitem_created_by",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Created By",
                    ),
                ),
                (
                    "updated_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="issuepipelineitem_updated_by",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Last Modified By",
                    ),
                ),
                (
                    "project",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="project_issuepipelineitem",
                        to="db.project",
                    ),
                ),
                (
                    "workspace",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="workspace_issuepipelineitem",
                        to="db.workspace",
                    ),
                ),
                (
                    "parent_issue",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="pipeline_items",
                        to="db.issue",
                    ),
                ),
                (
                    "child_issue",
                    models.OneToOneField(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="pipeline_metadata",
                        to="db.issue",
                    ),
                ),
                (
                    "pipeline_state",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="pipeline_items",
                        to="db.state",
                    ),
                ),
                ("state_name_snapshot", models.CharField(max_length=255)),
                ("name", models.CharField(blank=True, max_length=255)),
                ("start_date", models.DateField(blank=True, null=True)),
                ("target_date", models.DateField(blank=True, null=True)),
                ("target_time", models.TimeField(blank=True, null=True)),
                ("assignee_ids", ArrayField(base_field=models.UUIDField(), blank=True, default=list)),
                ("sort_order", models.FloatField(default=65535)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Pending"),
                            ("active", "Active"),
                            ("completed", "Completed"),
                            ("skipped", "Skipped"),
                        ],
                        default="pending",
                        max_length=20,
                    ),
                ),
                ("hidden_from_board", models.BooleanField(default=True)),
                ("auto_completed", models.BooleanField(default=False)),
                (
                    "completed_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="completed_pipeline_items",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                ("completed_at", models.DateTimeField(blank=True, null=True)),
            ],
            options={
                "db_table": "issue_pipeline_items",
                "ordering": ("sort_order", "created_at"),
                "verbose_name": "Issue Pipeline Item",
                "verbose_name_plural": "Issue Pipeline Items",
            },
        ),
        migrations.AddConstraint(
            model_name="issuepipelineitem",
            constraint=models.UniqueConstraint(
                condition=models.Q(deleted_at__isnull=True, pipeline_state__isnull=False),
                fields=("parent_issue", "pipeline_state"),
                name="issue_pipeline_unique_parent_state_when_active",
            ),
        ),
    ]
