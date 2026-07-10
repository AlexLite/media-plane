from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("db", "0136_profile_timestamp_display")]

    operations = [
        migrations.AlterField(
            model_name="profile",
            name="timestamp_display",
            field=models.CharField(
                choices=[("exact", "Exact"), ("relative", "Relative")], default="exact", max_length=16
            ),
        ),
    ]
