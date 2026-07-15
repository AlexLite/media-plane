# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from django.db import models

from .base import BaseModel


class FreeFrameReviewLink(BaseModel):
    """One immutable FreeFrame asset binding for a Plane work item."""

    issue = models.OneToOneField(
        "db.Issue",
        on_delete=models.CASCADE,
        related_name="freeframe_review_link",
    )
    asset_id = models.UUIDField(unique=True, db_index=True)

    class Meta:
        verbose_name = "FreeFrame Review Link"
        verbose_name_plural = "FreeFrame Review Links"
        db_table = "freeframe_review_links"
        ordering = ("-created_at",)

    def __str__(self):
        return f"{self.issue_id} -> {self.asset_id}"
