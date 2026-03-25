/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { FC, ReactNode } from "react";
import {
  RotateCcw,
  Network,
  Inbox,
  AlignLeft,
  Paperclip,
  Type,
  FileText,
  Hash,
  Clock,
  Bell,
  GitBranch,
  Timer,
  ListTodo,
  Layers,
} from "lucide-react";
// components

import {
  LinkIcon,
  ArchiveIcon,
  CycleIcon,
  GlobeIcon,
  DueDatePropertyIcon,
  EstimatePropertyIcon,
  GridLayoutIcon,
  IntakeIcon,
  LabelPropertyIcon,
  MembersPropertyIcon,
  ModuleIcon,
  PriorityPropertyIcon,
  StartDatePropertyIcon,
  StatePropertyIcon,
} from "@plane/propel/icons";
import { store } from "@/lib/store-context";
import type { TProjectActivity } from "@/plane-web/types";

type ActivityIconMap = {
  [key: string]: FC<{ className?: string }>;
};
export const iconsMap: ActivityIconMap = {
  priority: PriorityPropertyIcon,
  archived_at: ArchiveIcon,
  restored: RotateCcw,
  link: LinkIcon,
  start_date: StartDatePropertyIcon,
  target_date: DueDatePropertyIcon,
  label: LabelPropertyIcon,
  inbox: Inbox,
  description: AlignLeft,
  assignee: MembersPropertyIcon,
  attachment: Paperclip,
  name: Type,
  state: StatePropertyIcon,
  estimate: EstimatePropertyIcon,
  cycle: CycleIcon,
  module: ModuleIcon,
  page: FileText,
  network: GlobeIcon,
  identifier: Hash,
  timezone: Clock,
  is_project_updates_enabled: Bell,
  is_epic_enabled: GridLayoutIcon,
  is_workflow_enabled: GitBranch,
  is_time_tracking_enabled: Timer,
  is_issue_type_enabled: ListTodo,
  default: Network,
  module_view: ModuleIcon,
  cycle_view: CycleIcon,
  issue_views_view: Layers,
  page_view: FileText,
  intake_view: IntakeIcon,
};

type TTranslateFn = (key: string) => string;

export const messages = (
  activity: TProjectActivity,
  t?: TTranslateFn
): { message: string | ReactNode; customUserName?: string } => {
  const activityType = activity.field;
  const newValue = activity.new_value;
  const oldValue = activity.old_value;
  const verb = activity.verb;
  const workspaceDetail = store.workspaceRoot.getWorkspaceById(activity.workspace);

  const tt = (key: string, fallback: string) => {
    if (!t) return fallback;
    const translated = t(key);
    return translated === key ? fallback : translated;
  };

  const verbText = (value: string | undefined) => {
    if (value === "created") return tt("project_activity_feed.verbs.created", "created");
    if (value === "removed") return tt("project_activity_feed.verbs.removed", "removed");
    if (value === "updated") return tt("project_activity_feed.verbs.updated", "updated");
    return value ?? "";
  };

  const getBooleanActionText = (value: string | undefined) => {
    if (value === "true") return tt("project_activity_feed.enabled", "enabled");
    if (value === "false") return tt("project_activity_feed.disabled", "disabled");
    return verbText(verb);
  };

  switch (activityType) {
    case "priority":
      return {
        message: (
          <>
            {tt("project_activity_feed.set_priority_to", "set the priority to")}{" "}
            <span className="font-medium text-primary">{newValue || tt("project_activity_feed.none", "none")}</span>
          </>
        ),
      };
    case "archived_at":
      return {
        message:
          newValue === "restore"
            ? tt("project_activity_feed.restored_project", "restored the project")
            : tt("project_activity_feed.archived_project", "archived the project"),
        customUserName: newValue === "archive" ? "Plane" : undefined,
      };
    case "name":
      return {
        message: (
          <>
            {tt("project_activity_feed.renamed_project_to", "renamed the project to")}{" "}
            <span className="font-medium text-primary">{newValue}</span>
          </>
        ),
      };
    case "description":
      return {
        message: newValue
          ? tt("project_activity_feed.updated_project_description", "updated the project description")
          : tt("project_activity_feed.removed_project_description", "removed the project description"),
      };
    case "start_date":
      return {
        message: (
          <>
            {newValue ? (
              <>
                {tt("project_activity_feed.set_start_date_to", "set the start date to")}{" "}
                <span className="font-medium text-primary">{newValue}</span>
              </>
            ) : (
              tt("project_activity_feed.removed_start_date", "removed the start date")
            )}
          </>
        ),
      };
    case "target_date":
      return {
        message: (
          <>
            {newValue ? (
              <>
                {tt("project_activity_feed.set_target_date_to", "set the target date to")}{" "}
                <span className="font-medium text-primary">{newValue}</span>
              </>
            ) : (
              tt("project_activity_feed.removed_target_date", "removed the target date")
            )}
          </>
        ),
      };
    case "state":
      return {
        message: (
          <>
            {tt("project_activity_feed.set_state_to", "set the state to")}{" "}
            <span className="font-medium text-primary">{newValue || tt("project_activity_feed.none", "none")}</span>
          </>
        ),
      };
    case "estimate":
      return {
        message: (
          <>
            {newValue ? (
              <>
                {tt("project_activity_feed.set_estimate_to", "set the estimate point to")}{" "}
                <span className="font-medium text-primary">{newValue}</span>
              </>
            ) : (
              <>
                {tt("project_activity_feed.removed_estimate", "removed the estimate point")}
                {oldValue && (
                  <>
                    {" "}
                    <span className="font-medium text-primary">{oldValue}</span>
                  </>
                )}
              </>
            )}
          </>
        ),
      };
    case "cycles":
      return {
        message: (
          <>
            <span>
              {verbText(verb)} {tt("project_activity_feed.this_project", "this project")}{" "}
              {verb === "removed"
                ? tt("project_activity_feed.from", "from")
                : tt("project_activity_feed.to", "to")}{" "}
              {tt("project_activity_feed.the_cycle", "the cycle")}{" "}
            </span>
            {verb !== "removed" ? (
              <a
                href={`/${workspaceDetail?.slug}/projects/${activity.project}/cycles/${activity.new_identifier}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex font-medium text-primary"
              >
                {activity.new_value}
              </a>
            ) : (
              <span className="font-medium text-primary">
                {activity.old_value || tt("project_activity_feed.unknown_cycle", "Unknown cycle")}
              </span>
            )}
          </>
        ),
      };
    case "modules":
      return {
        message: (
          <>
            <span>
              {verbText(verb)} {tt("project_activity_feed.this_project", "this project")}{" "}
              {verb === "removed"
                ? tt("project_activity_feed.from", "from")
                : tt("project_activity_feed.to", "to")}{" "}
              {tt("project_activity_feed.the_module", "the module")}{" "}
            </span>
            <span className="font-medium text-primary">
              {verb === "removed" ? oldValue : newValue || tt("project_activity_feed.unknown_module", "Unknown module")}
            </span>
          </>
        ),
      };
    case "labels":
      return {
        message: (
          <>
            {verbText(verb)} {tt("project_activity_feed.the_label", "the label")}{" "}
            <span className="font-medium text-primary">
              {newValue || oldValue || tt("project_activity_feed.untitled_label", "Untitled label")}
            </span>
          </>
        ),
      };
    case "inbox":
      return {
        message: (
          <>
            {newValue ? tt("project_activity_feed.enabled", "enabled") : tt("project_activity_feed.disabled", "disabled")}{" "}
            {tt("project_activity_feed.inbox", "inbox")}
          </>
        ),
      };
    case "page":
      return {
        message: (
          <>
            {newValue
              ? tt("project_activity_feed.verbs.created", "created")
              : tt("project_activity_feed.verbs.removed", "removed")}{" "}
            {tt("project_activity_feed.the_project_page", "the project page")}{" "}
            <span className="font-medium text-primary">
              {newValue || oldValue || tt("project_activity_feed.untitled_page", "Untitled page")}
            </span>
          </>
        ),
      };
    case "network":
      return {
        message: (
          <>
            {newValue ? tt("project_activity_feed.enabled", "enabled") : tt("project_activity_feed.disabled", "disabled")}{" "}
            {tt("project_activity_feed.network_access", "network access")}
          </>
        ),
      };
    case "identifier":
      return {
        message: (
          <>
            {tt("project_activity_feed.updated_project_identifier_to", "updated project identifier to")}{" "}
            <span className="font-medium text-primary">{newValue || tt("project_activity_feed.none", "none")}</span>
          </>
        ),
      };
    case "timezone":
      return {
        message: (
          <>
            {tt("project_activity_feed.changed_project_timezone_to", "changed project timezone to")}{" "}
            <span className="font-medium text-primary">{newValue || tt("project_activity_feed.default", "default")}</span>
          </>
        ),
      };
    case "module_view":
    case "cycle_view":
    case "issue_views_view":
    case "page_view":
    case "intake_view":
      return {
        message: (
          <>
            {getBooleanActionText(newValue)} {activityType.replace(/_view$/, "").replace(/_/g, " ")}{" "}
            {tt("project_activity_feed.view", "view")}
          </>
        ),
      };
    case "is_project_updates_enabled":
      return {
        message: (
          <>
            {getBooleanActionText(newValue)} {tt("project_activity_feed.project_updates", "project updates")}
          </>
        ),
      };
    case "is_epic_enabled":
      return {
        message: (
          <>
            {getBooleanActionText(newValue)} {tt("project_activity_feed.epics", "epics")}
          </>
        ),
      };
    case "is_workflow_enabled":
      return {
        message: (
          <>
            {getBooleanActionText(newValue)} {tt("project_activity_feed.custom_workflow", "custom workflow")}
          </>
        ),
      };
    case "is_time_tracking_enabled":
      return {
        message: (
          <>
            {getBooleanActionText(newValue)} {tt("project_activity_feed.time_tracking", "time tracking")}
          </>
        ),
      };
    case "is_issue_type_enabled":
      return {
        message: (
          <>
            {getBooleanActionText(newValue)} {tt("project_activity_feed.work_item_types", "work item types")}
          </>
        ),
      };
    default:
      return {
        message: `${verbText(verb)} ${activityType?.replace(/_/g, " ")} `,
      };
  }
};
