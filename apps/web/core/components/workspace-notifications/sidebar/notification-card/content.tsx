/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { ReactNode } from "react";
import { useTranslation } from "@plane/i18n";
// plane imports
import type { TNotification } from "@plane/types";
import {
  convertMinutesToHoursMinutesString,
  renderFormattedDate,
  sanitizeCommentForNotification,
  stripAndTruncateHTML,
} from "@plane/utils";
// components
import { LiteTextEditor } from "@/components/editor/lite-text";
import {
  ADDITIONAL_NOTIFICATION_CONTENT_MAP,
  renderAdditionalAction,
  renderAdditionalValue,
  shouldShowConnector,
} from "@/plane-web/components/workspace-notifications/notification-card/content";

// Types
export type TNotificationFieldData = {
  field: string | undefined;
  newValue: string | undefined;
  oldValue: string | undefined;
  verb: string | undefined;
};

export type TNotificationContentDetails = {
  action?: ReactNode;
  value?: ReactNode;
  showConnector?: boolean;
};

export type TNotificationContentHandler = (
  data: TNotificationFieldData,
  t: (key: string) => string
) => TNotificationContentDetails | null;

export type TNotificationContentMap = {
  [key: string]: TNotificationContentHandler;
};

// Base notification content map for core fields
export const getBaseNotificationContentMap = (): TNotificationContentMap => ({
  duplicate: ({ verb }, t) => ({
    action:
      verb === "created"
        ? t("notification.content.actions.marked_as_duplicate")
        : t("notification.content.actions.unmarked_as_duplicate"),
    value: null,
    showConnector: false,
  }),
  assignees: ({ newValue, oldValue }, t) => ({
    action:
      newValue !== ""
        ? t("notification.content.actions.added_assignee")
        : t("notification.content.actions.removed_assignee"),
    value: newValue !== "" ? newValue : oldValue,
    showConnector: false,
  }),
  start_date: ({ newValue }, t) => ({
    action:
      newValue !== ""
        ? t("notification.content.actions.set_start_date")
        : t("notification.content.actions.removed_start_date"),
    value: renderFormattedDate(newValue),
    showConnector: false,
  }),
  target_date: ({ newValue }, t) => ({
    action:
      newValue !== ""
        ? t("notification.content.actions.set_due_date")
        : t("notification.content.actions.removed_due_date"),
    value: renderFormattedDate(newValue),
    showConnector: false,
  }),
  name: ({ newValue }, t) => ({
    action: t("notification.content.actions.changed_name_to"),
    value: newValue,
    showConnector: false,
  }),
  priority: ({ newValue }, t) => ({
    action:
      newValue !== ""
        ? t("notification.content.actions.changed_priority_to")
        : t("notification.content.actions.removed_priority"),
    value: newValue,
    showConnector: false,
  }),
  state: ({ newValue }, t) => ({
    action: t("notification.content.actions.changed_state_to"),
    value: newValue,
    showConnector: false,
  }),
  state_id: ({ newValue }, t) => ({
    action: t("notification.content.actions.changed_state_to"),
    value: newValue,
    showConnector: false,
  }),
  labels: ({ newValue, oldValue }, t) => ({
    action:
      newValue !== "" ? t("notification.content.actions.added_label") : t("notification.content.actions.removed_label"),
    value: newValue !== "" ? newValue : oldValue,
    showConnector: false,
  }),
  parent: ({ newValue, oldValue }, t) => ({
    action:
      newValue !== ""
        ? t("notification.content.actions.added_parent")
        : t("notification.content.actions.removed_parent"),
    value: newValue !== "" ? newValue : oldValue,
    showConnector: false,
  }),
  relates_to: (_, t) => ({
    action: t("notification.content.actions.related_to"),
    value: null,
    showConnector: true,
  }),
  comment: ({ newValue }, t) => ({
    action: t("notification.content.actions.commented"),
    value: renderCommentBox ? null : sanitizeCommentForNotification(newValue),
    showConnector: false,
  }),
  archived_at: ({ newValue }, t) => ({
    action:
      newValue === "restore"
        ? t("notification.content.actions.restored_work_item")
        : t("notification.content.actions.archived_work_item"),
    value: null,
    showConnector: false,
  }),
  None: (_, t) => ({
    action: null,
    value: t("notification.content.assigned_to_you"),
    showConnector: false,
  }),
  // Fields below only define value - action falls through to default handler
  attachment: (_, t) => ({
    action: t("notification.content.actions.updated_attachments"),
    value: null,
    showConnector: false,
  }),
  description: ({ newValue }, t) => ({
    action: t("notification.content.actions.changed_description_to"),
    value: stripAndTruncateHTML(newValue || "", 55),
    showConnector: false,
  }),
  estimate_time: ({ newValue, oldValue }, t) => ({
    action: t("notification.content.actions.changed_estimate_to"),
    value:
      newValue !== ""
        ? convertMinutesToHoursMinutesString(Number(newValue))
        : convertMinutesToHoursMinutesString(Number(oldValue)),
    showConnector: false,
  }),
});

// Helper to get content details from maps
const getNotificationContentDetails = (
  fieldData: TNotificationFieldData,
  t: (key: string) => string
): TNotificationContentDetails | null => {
  const { field } = fieldData;
  if (!field) return null;

  // Check base map first
  const baseHandler = getBaseNotificationContentMap()[field];
  if (baseHandler) {
    return baseHandler(fieldData, t);
  }

  // Check additional map from plane-web (EE extensions)
  const additionalHandler = ADDITIONAL_NOTIFICATION_CONTENT_MAP[field];
  if (additionalHandler) {
    return additionalHandler(fieldData, t);
  }

  return null;
};

export function NotificationContent({
  notification,
  workspaceId,
  workspaceSlug,
  projectId,
  renderCommentBox = false,
}: {
  notification: TNotification;
  workspaceId: string;
  workspaceSlug: string;
  projectId: string;
  renderCommentBox?: boolean;
}) {
  const { t } = useTranslation();
  const { data, triggered_by_details: triggeredBy } = notification;
  const notificationField = data?.issue_activity.field;
  const newValue = data?.issue_activity.new_value;
  const oldValue = data?.issue_activity.old_value;
  const verb = data?.issue_activity.verb;

  const fieldData: TNotificationFieldData = {
    field: notificationField,
    newValue,
    oldValue,
    verb,
  };

  const renderTriggerName = () => (
    <span className="font-medium text-primary">
      {triggeredBy?.is_bot ? triggeredBy.first_name : triggeredBy?.display_name}{" "}
    </span>
  );

  // Get content details from map
  const contentDetails = getNotificationContentDetails(fieldData, t);

  // Render action - use map value if defined, otherwise fall through to default handler
  // Note: undefined = fall through to default, null = explicitly no action text
  const renderAction = (): ReactNode => {
    if (!notificationField) return "";
    // Check if action is explicitly defined in map (including null)
    if (contentDetails && "action" in contentDetails) return contentDetails.action;
    // Fallback to default action handler for fields not in map or without action defined
    return renderAdditionalAction(notificationField, verb, t);
  };

  // Render value - use map value if defined, otherwise fall through to default handler
  const renderValue = (): ReactNode => {
    // Check if value is explicitly defined in map
    if (contentDetails && "value" in contentDetails) return contentDetails.value;
    // Fallback to default value handler for fields not in map or without value defined
    return renderAdditionalValue(notificationField, newValue, oldValue);
  };

  // Determine if connector should be shown - prefer map value, fallback to function
  const showConnector =
    contentDetails?.showConnector !== undefined ? contentDetails.showConnector : shouldShowConnector(notificationField);

  return (
    <>
      {renderTriggerName()}
      <span className="text-tertiary">{renderAction()} </span>
      {verb !== "deleted" && (
        <>
          {showConnector && <span className="text-tertiary">{t("notification.content.connector")} </span>}
          <span className="font-medium text-primary">{renderValue()}</span>
          {notificationField === "comment" && renderCommentBox && (
            <div className="origin-left scale-75">
              <LiteTextEditor
                editable={false}
                id=""
                initialValue={newValue ?? ""}
                workspaceId={workspaceId}
                workspaceSlug={workspaceSlug}
                projectId={projectId}
                displayConfig={{
                  fontSize: "small-font",
                }}
              />
            </div>
          )}
          {"."}
        </>
      )}
    </>
  );
}
