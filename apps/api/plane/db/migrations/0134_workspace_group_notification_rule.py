# Generated for workspace group notification rules

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ("db", "0133_project_default_target_time"),
    ]

    operations = [
        migrations.CreateModel(
            name="WorkspaceGroupNotificationRule",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="Created At")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="Last Modified At")),
                ("deleted_at", models.DateTimeField(blank=True, null=True, verbose_name="Deleted At")),
                ("id", models.UUIDField(db_index=True, default=uuid.uuid4, editable=False, primary_key=True, serialize=False, unique=True)),
                ("created_by", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="%(class)s_created_by", to=settings.AUTH_USER_MODEL, verbose_name="Created By")),
                ("updated_by", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="%(class)s_updated_by", to=settings.AUTH_USER_MODEL, verbose_name="Last Modified By")),
                ("group", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="notification_rules", to="db.workspacegroup")),
                ("project", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="workspace_group_notification_rules", to="db.project")),
                ("state", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="workspace_group_notification_rules", to="db.state")),
                ("workspace", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="workspace_group_notification_rules", to="db.workspace")),
            ],
            options={
                "verbose_name": "Workspace Group Notification Rule",
                "verbose_name_plural": "Workspace Group Notification Rules",
                "db_table": "workspace_group_notification_rules",
                "ordering": ("project_id", "state__sequence", "created_at"),
            },
        ),
        migrations.AddConstraint(
            model_name="workspacegroupnotificationrule",
            constraint=models.UniqueConstraint(condition=models.Q(("deleted_at__isnull", True)), fields=("group", "project", "state"), name="workspace_group_notification_rule_unique_active"),
        ),
    ]
