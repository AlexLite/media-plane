/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { TIssueActivity } from "@plane/types";

export const getRelationActivityContent = (activity: TIssueActivity | undefined): string | undefined => {
  if (!activity) return;

  const relation = activity.field as "blocking" | "blocked_by" | "duplicate" | "relates_to";
  const operation = activity.old_value === "" ? "added" : "removed";
  const supportedRelations = ["blocking", "blocked_by", "duplicate", "relates_to"];

  return supportedRelations.includes(relation) ? `activity_feed.relations.${relation}.${operation}` : undefined;
};
