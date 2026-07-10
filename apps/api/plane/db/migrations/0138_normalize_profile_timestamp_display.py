from django.db import migrations


VALID_TIMESTAMP_DISPLAYS = ("exact", "relative")


def normalize_timestamp_display(apps, schema_editor):
    Profile = apps.get_model("db", "Profile")
    Profile.objects.exclude(timestamp_display__in=VALID_TIMESTAMP_DISPLAYS).update(timestamp_display="exact")


class Migration(migrations.Migration):
    dependencies = [("db", "0137_profile_timestamp_display_choices")]

    operations = [migrations.RunPython(normalize_timestamp_display, migrations.RunPython.noop)]
