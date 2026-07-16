# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from crum import get_current_user
from django.db import transaction
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from plane.db.models import Issue, IssueComment
from plane.utils.realtime import publish_issue_realtime_event


def _actor_id(instance):
    user = get_current_user()
    if user is not None and not user.is_anonymous:
        return user.id
    return instance.updated_by_id or instance.created_by_id


def _issue_patch(instance):
    return {
        "id": str(instance.id),
        "state_id": str(instance.state_id) if instance.state_id else None,
        "priority": instance.priority,
        "start_date": instance.start_date,
        "target_date": instance.target_date,
        "target_time": instance.target_time,
        "completed_at": instance.completed_at,
        "archived_at": instance.archived_at,
        "updated_at": instance.updated_at,
    }


@receiver(post_save, sender=Issue, dispatch_uid="plane.issue.realtime.post_save")
def publish_issue_change(sender, instance, created, raw=False, update_fields=None, **kwargs):
    if raw or created:
        return

    # The activity worker touches updated_at after every activity. Do not turn
    # that bookkeeping write into a second user-facing realtime event.
    if update_fields and set(update_fields).issubset({"updated_at"}):
        return

    event_kwargs = {
        "event_type": "issue.updated",
        "issue_id": instance.id,
        "project_id": instance.project_id,
        "workspace_id": instance.workspace_id,
        "actor_id": _actor_id(instance),
        "data": _issue_patch(instance),
    }
    transaction.on_commit(lambda: publish_issue_realtime_event(**event_kwargs))


@receiver(post_save, sender=IssueComment, dispatch_uid="plane.issue_comment.realtime.post_save")
def publish_comment_change(sender, instance, created, raw=False, update_fields=None, **kwargs):
    if raw:
        return

    # The standard API delete path is a soft delete implemented as save(), so
    # it emits post_save rather than post_delete.
    if instance.deleted_at is not None:
        event_kwargs = {
            "event_type": "comment.deleted",
            "issue_id": instance.issue_id,
            "project_id": instance.project_id,
            "workspace_id": instance.workspace_id,
            "actor_id": _actor_id(instance),
            "data": {"id": str(instance.id)},
        }
        transaction.on_commit(lambda: publish_issue_realtime_event(**event_kwargs))
        return

    # IssueComment.save() performs a second internal save after creating its
    # Description row. Ignore that implementation detail to avoid duplicates.
    if update_fields and set(update_fields).issubset({"description_id"}):
        return

    event_type = "comment.created" if created else "comment.updated"
    actor_id = _actor_id(instance)

    def publish():
        from plane.app.serializers import IssueCommentSerializer

        publish_issue_realtime_event(
            event_type=event_type,
            issue_id=instance.issue_id,
            project_id=instance.project_id,
            workspace_id=instance.workspace_id,
            actor_id=actor_id,
            data=IssueCommentSerializer(instance).data,
        )

    transaction.on_commit(publish)


@receiver(post_delete, sender=IssueComment, dispatch_uid="plane.issue_comment.realtime.post_delete")
def publish_comment_delete(sender, instance, **kwargs):
    event_kwargs = {
        "event_type": "comment.deleted",
        "issue_id": instance.issue_id,
        "project_id": instance.project_id,
        "workspace_id": instance.workspace_id,
        "actor_id": _actor_id(instance),
        "data": {"id": str(instance.id)},
    }
    transaction.on_commit(lambda: publish_issue_realtime_event(**event_kwargs))
