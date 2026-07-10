# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from plane.db.models import IssuePipelineItem


def validate_parent_issue_pipeline_target_date(issue, target_date):
    """Keep a parent issue deadline on or after all native pipeline deadlines."""
    if target_date is None:
        return None

    latest_pipeline_target_date = (
        IssuePipelineItem.objects.filter(parent_issue=issue, target_date__isnull=False)
        .order_by("-target_date")
        .values_list("target_date", flat=True)
        .first()
    )
    if latest_pipeline_target_date and target_date < latest_pipeline_target_date:
        return "Parent issue target date cannot be earlier than existing pipeline step due dates"

    return None
