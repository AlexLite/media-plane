# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

import asyncio
import json
from contextlib import suppress

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

SSE_FLUSH_PADDING = ":" + (" " * 65536) + "\n\n"
SSE_MAX_IDLE_HEARTBEATS = 20


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
    messages = pubsub.listen()
    message_queue = asyncio.Queue()

    async def read_messages():
        async for message in messages:
            if message.get("type") == "message":
                await message_queue.put(message)

    reader_task = None
    try:
        await pubsub.subscribe(channel)
        reader_task = asyncio.create_task(read_messages())
        yield "retry: 3000\n: connected\n\n"
        idle_heartbeat_count = 0

        while True:
            try:
                message = await asyncio.wait_for(message_queue.get(), timeout=15.0)
            except TimeoutError:
                idle_heartbeat_count += 1
                yield ": heartbeat\n\n"
                # The public relay can keep the upstream request open after its
                # downstream client has disappeared. Rotate idle streams so the
                # Redis subscription is eventually released regardless of the
                # relay's disconnect propagation. Native EventSource reconnects
                # using the retry value sent above.
                if idle_heartbeat_count >= SSE_MAX_IDLE_HEARTBEATS:
                    return
                continue

            idle_heartbeat_count = 0
            payload = message.get("data")
            if not isinstance(payload, str):
                payload = payload.decode("utf-8")

            event = json.loads(payload)
            event_id = event.get("event_id", "")
            event_type = event.get("type", "message")
            yield f"id: {event_id}\nevent: {event_type}\ndata: {payload}\n\n{SSE_FLUSH_PADDING}"
    finally:
        if reader_task is not None:
            reader_task.cancel()
            with suppress(asyncio.CancelledError):
                await reader_task
        with suppress(RuntimeError):
            await messages.aclose()
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
