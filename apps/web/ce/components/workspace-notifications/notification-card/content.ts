/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { replaceUnderscoreIfSnakeCase } from "@plane/utils";
import type { TNotificationContentMap } from "@/components/workspace-notifications/sidebar/notification-card/content";

const FIELD_LABELS: Record<string, string> = {
  name: "название",
  priority: "приоритет",
  state: "статус",
  state_id: "статус",
  description: "описание",
  attachment: "вложения",
  estimate_time: "оценку",
  start_date: "дату начала",
  target_date: "срок выполнения",
};

const VERB_LABELS: Record<string, string> = {
  created: "добавил",
  updated: "изменил",
  deleted: "удалил",
};

// Additional notification content map for CE (empty - EE extends this)
export const ADDITIONAL_NOTIFICATION_CONTENT_MAP: TNotificationContentMap = {};

// Fallback action renderer for fields not in the map
export const renderAdditionalAction = (notificationField: string, verb: string | undefined) => {
  const baseAction = !["comment", "archived_at"].includes(notificationField)
    ? verb
      ? VERB_LABELS[verb] || verb
      : ""
    : "";
  return `${baseAction} ${FIELD_LABELS[notificationField] || replaceUnderscoreIfSnakeCase(notificationField)}`;
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
