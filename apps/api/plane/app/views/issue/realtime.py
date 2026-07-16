# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

import json

import redis.asyncio as async_redis
from django.conf import settings
from django.http import StreamingHttpResponse
from rest_framework import status
from rest_framework.renderers import BaseRenderer, JSONRenderer
from rest_framework.response import Response

from plane.app.permissions import ROLE, allow_permission
from plane.db.models import Issue, Project, ProjectMember
from plane.utils.realtime import issue_realtime_channel

from .. import BaseAPIView


class ServerSentEventRenderer(BaseRenderer):
    media_type = "text/event-stream"
    format = "sse"

    def render(self, data, accepted_media_type=None, renderer_context=None):
        if data is None:
            return b""
        if isinstance(data, bytes):
            return data
        if isinstance(data, str):
            return data.encode(self.charset)
        return json.dumps(data).encode(self.charset)


async def issue_event_stream(issue_id):
    redis_kwargs = {"decode_responses": True}
    if settings.REDIS_SSL:
        redis_kwargs["ssl_cert_reqs"] = None

    redis_client = async_redis.Redis.from_url(settings.REDIS_URL, **redis_kwargs)
    pubsub = redis_client.pubsub()
    channel = issue_realtime_channel(issue_id)

    try:
        await pubsub.subscribe(channel)
        yield "retry: 3000\n: connected\n\n"

        while True:
            message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=15.0)
            if message is None:
                yield ": heartbeat\n\n"
                continue

            payload = message.get("data")
            if not isinstance(payload, str):
                payload = payload.decode("utf-8")

            event = json.loads(payload)
            event_id = event.get("event_id", "")
            event_type = event.get("type", "message")
            yield f"id: {event_id}\nevent: {event_type}\ndata: {payload}\n\n"
    finally:
        await pubsub.unsubscribe(channel)
        await pubsub.aclose()
        await redis_client.aclose()


class IssueRealtimeEventsEndpoint(BaseAPIView):
    # EventSource sends `Accept: text/event-stream`. Registering an SSE
    # renderer prevents DRF from rejecting the request with HTTP 406 before
    # the streaming response reaches this view.
    renderer_classes = [JSONRenderer, ServerSentEventRenderer]

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST])
    def get(self, request, slug, project_id, issue_id):
        project = Project.objects.filter(pk=project_id, workspace__slug=slug, archived_at__isnull=True).first()
        issue = Issue.objects.filter(pk=issue_id, project_id=project_id, workspace__slug=slug).first()

        if project is None or issue is None:
            return Response({"error": "Work item not found"}, status=status.HTTP_404_NOT_FOUND)

        membership = ProjectMember.objects.filter(
            workspace__slug=slug,
            project_id=project_id,
            member=request.user,
            is_active=True,
        ).first()
        if membership is None:
            return Response({"error": "Project access required"}, status=status.HTTP_403_FORBIDDEN)

        is_restricted_guest = (
            membership.role == ROLE.GUEST.value
            and not project.guest_view_all_features
            and issue.created_by != request.user
        )
        if is_restricted_guest:
            return Response({"error": "You are not allowed to view this issue"}, status=status.HTTP_403_FORBIDDEN)

        response = StreamingHttpResponse(issue_event_stream(issue_id), content_type="text/event-stream")
        response["Cache-Control"] = "no-cache, no-store, must-revalidate, no-transform"
        response["Pragma"] = "no-cache"
        response["X-Accel-Buffering"] = "no"
        return response
