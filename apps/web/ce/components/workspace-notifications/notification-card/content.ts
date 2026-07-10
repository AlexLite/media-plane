/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { replaceUnderscoreIfSnakeCase } from "@plane/utils";
import type { TNotificationContentMap } from "@/components/workspace-notifications/sidebar/notification-card/content";

const FIELD_LABEL_KEYS: Record<string, string> = {
  name: "notification.content.fields.name",
  priority: "notification.content.fields.priority",
  state: "notification.content.fields.state",
  state_id: "notification.content.fields.state",
  description: "notification.content.fields.description",
  attachment: "notification.content.fields.attachments",
  estimate_time: "notification.content.fields.estimate",
  start_date: "notification.content.fields.start_date",
  target_date: "notification.content.fields.due_date",
};

const VERB_LABEL_KEYS: Record<string, string> = {
  created: "notification.content.verbs.created",
  updated: "notification.content.verbs.updated",
  deleted: "notification.content.verbs.deleted",
};

// Additional notification content map for CE (empty - EE extends this)
export const ADDITIONAL_NOTIFICATION_CONTENT_MAP: TNotificationContentMap = {};

// Fallback action renderer for fields not in the map
export const renderAdditionalAction = (
  notificationField: string,
  verb: string | undefined,
  t: (key: string) => string
) => {
  const baseAction = !["comment", "archived_at"].includes(notificationField)
    ? verb
      ? t(VERB_LABEL_KEYS[verb] || verb)
      : ""
    : "";
  const fieldKey = FIELD_LABEL_KEYS[notificationField];
  return `${baseAction} ${fieldKey ? t(fieldKey) : replaceUnderscoreIfSnakeCase(notificationField)}`;
};

// Fallback value renderer for fields not in the map
export const renderAdditionalValue = (
  _notificationField: string | undefined,
  newValue: string | undefined,
  _oldValue: string | undefined
) => newValue;

export const shouldShowConnector = (notificationField: string | undefined) =>
  !["comment", "archived_at", "None", "assignees", "labels", "start_date", "target_date", "parent"].includes(
    notificationField || ""
  );

export const shouldRender = (notificationField: string | undefined, verb: string | undefined) => verb !== "deleted";
