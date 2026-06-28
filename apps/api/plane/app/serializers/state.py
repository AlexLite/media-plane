# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

# Module imports
from .base import BaseSerializer
from rest_framework import serializers

from plane.db.models import State, StateGroup


class StateSerializer(BaseSerializer):
    order = serializers.FloatField(required=False)

    class Meta:
        model = State
        fields = [
            "id",
            "project_id",
            "workspace_id",
            "name",
            "color",
            "group",
            "is_pipeline_enabled",
            "pipeline_aliases",
            "default",
            "description",
            "sequence",
            "order",
        ]
        read_only_fields = ["workspace", "project"]

    def validate(self, attrs):
        if attrs.get("group") == StateGroup.TRIAGE.value:
            raise serializers.ValidationError("Cannot create triage state")
        return attrs

    def validate_pipeline_aliases(self, value):
        if value is None:
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError("Pipeline aliases must be a list")

        aliases = []
        seen = set()
        for alias in value:
            if not isinstance(alias, str):
                raise serializers.ValidationError("Pipeline aliases must be strings")
            alias = alias.strip()
            alias_key = alias.lower()
            if alias and alias_key not in seen:
                aliases.append(alias)
                seen.add(alias_key)

        return aliases


class StateLiteSerializer(BaseSerializer):
    class Meta:
        model = State
        fields = ["id", "name", "color", "group"]
        read_only_fields = fields
