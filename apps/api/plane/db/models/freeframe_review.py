# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from django.db import models
from django.db.models import Q

from .base import BaseModel


class FreeFrameReviewLink(BaseModel):
    """One active FreeFrame asset binding for a Plane work item."""

    issue = models.ForeignKey(
        "db.Issue",
        on_delete=models.CASCADE,
        related_name="freeframe_review_links",
    )
    asset_id = models.UUIDField(db_index=True)

    class Meta:
        verbose_name = "FreeFrame Review Link"
        verbose_name_plural = "FreeFrame Review Links"
        db_table = "freeframe_review_links"
        ordering = ("-created_at",)
        constraints = [
            models.UniqueConstraint(
                fields=["issue"],
                condition=Q(deleted_at__isnull=True),
                name="freeframe_review_unique_active_issue",
            ),
            models.UniqueConstraint(
                fields=["asset_id"],
                condition=Q(deleted_at__isnull=True),
                name="freeframe_review_unique_active_asset",
            ),
        ]

    def __str__(self):
        return f"{self.issue_id} -> {self.asset_id}"
