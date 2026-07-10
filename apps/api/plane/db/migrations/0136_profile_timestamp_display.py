from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("db", "0135_project_archive_in_days")]

    operations = [
        migrations.AddField(
            model_name="profile",
            name="timestamp_display",
            field=models.CharField(default="exact", max_length=16),
        ),
    ]
