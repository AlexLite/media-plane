# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

import json
from unittest.mock import patch
from uuid import uuid4

from django.test import SimpleTestCase
from rest_framework.negotiation import DefaultContentNegotiation
from rest_framework.request import Request
from rest_framework.test import APIRequestFactory

from plane.app.views.issue.realtime import IssueRealtimeEventsEndpoint, ServerSentEventRenderer
from plane.utils.realtime import (
    build_issue_realtime_event,
    issue_realtime_channel,
    publish_issue_realtime_event,
)


class IssueRealtimeEventTests(SimpleTestCase):
    def test_endpoint_accepts_event_stream_content_negotiation(self):
        request = Request(APIRequestFactory().get("/events/", HTTP_ACCEPT="text/event-stream"))
        renderers = [renderer() for renderer in IssueRealtimeEventsEndpoint.renderer_classes]

        renderer, media_type = DefaultContentNegotiation().select_renderer(request, renderers)

        self.assertIsInstance(renderer, ServerSentEventRenderer)
        self.assertEqual(media_type, "text/event-stream")

    def test_issue_channel_is_scoped_to_issue(self):
        issue_id = uuid4()
        self.assertEqual(issue_realtime_channel(issue_id), f"plane:realtime:issue:{issue_id}")

    def test_event_envelope_is_versioned_and_serializable(self):
        issue_id = uuid4()
        project_id = uuid4()
        workspace_id = uuid4()

        event = build_issue_realtime_event(
            event_type="issue.updated",
            issue_id=issue_id,
            project_id=project_id,
            workspace_id=workspace_id,
            actor_id=None,
            data={"state_id": str(uuid4())},
        )

        self.assertEqual(event["v"], 1)
        self.assertEqual(event["type"], "issue.updated")
        self.assertEqual(event["issue_id"], str(issue_id))
        self.assertIsNotNone(event["event_id"])
        json.dumps(event)

    @patch("plane.utils.realtime.get_redis_connection")
    def test_publish_uses_issue_channel(self, get_redis_connection):
        redis = get_redis_connection.return_value
        issue_id = uuid4()

        event = publish_issue_realtime_event(
            event_type="comment.deleted",
            issue_id=issue_id,
            project_id=uuid4(),
            workspace_id=uuid4(),
            data={"id": str(uuid4())},
        )

        channel, payload = redis.publish.call_args.args
        self.assertEqual(channel, issue_realtime_channel(issue_id))
        self.assertEqual(json.loads(payload)["event_id"], event["event_id"])
