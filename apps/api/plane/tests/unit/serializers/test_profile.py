import pytest

from plane.app.serializers import ProfileSerializer
from plane.db.models import Profile


@pytest.mark.django_db
@pytest.mark.parametrize("timestamp_display", ["exact", "relative"])
def test_profile_serializer_accepts_supported_timestamp_display_values(create_user, timestamp_display):
    profile = Profile.objects.get(user=create_user)

    serializer = ProfileSerializer(instance=profile, data={"timestamp_display": timestamp_display}, partial=True)

    assert serializer.is_valid(), serializer.errors
    assert serializer.validated_data["timestamp_display"] == timestamp_display


@pytest.mark.django_db
def test_profile_serializer_rejects_unsupported_timestamp_display_value(create_user):
    profile = Profile.objects.get(user=create_user)

    serializer = ProfileSerializer(instance=profile, data={"timestamp_display": "compact"}, partial=True)

    assert not serializer.is_valid()
    assert "timestamp_display" in serializer.errors
