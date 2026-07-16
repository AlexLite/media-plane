# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

import json
import logging
from uuid import uuid4

from django.core.serializers.json import DjangoJSONEncoder
from django.utils import timezone
from django_redis import get_redis_connection

logger = logging.getLogger("plane")

ISSUE_REALTIME_CHANNEL_PREFIX = "plane:realtime:issue"


def issue_realtime_channel(issue_id):
    return f"{ISSUE_REALTIME_CHANNEL_PREFIX}:{issue_id}"


def build_issue_realtime_event(*, event_type, issue_id, project_id, workspace_id, data, actor_id=None):
    return {
        "v": 1,
        "event_id": str(uuid4()),
        "type": event_type,
        "issue_id": str(issue_id),
        "project_id": str(project_id),
        "workspace_id": str(workspace_id),
        "actor_id": str(actor_id) if actor_id else None,
        "occurred_at": timezone.now().isoformat(),
        "data": data,
    }


def publish_issue_realtime_event(*, event_type, issue_id, project_id, workspace_id, data, actor_id=None):
    event = build_issue_realtime_event(
        event_type=event_type,
        issue_id=issue_id,
        project_id=project_id,
        workspace_id=workspace_id,
        data=data,
        actor_id=actor_id,
    )

    try:
        redis = get_redis_connection("default")
        redis.publish(
            issue_realtime_channel(issue_id),
            json.dumps(event, cls=DjangoJSONEncoder, separators=(",", ":")),
        )
    except Exception:
        # Realtime delivery must never make the authoritative REST mutation fail.
        logger.exception(
            "Failed to publish realtime issue event",
            extra={"event_type": event_type, "issue_id": str(issue_id)},
        )

    return event
