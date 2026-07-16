/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

const DEFAULT_STATE_NAME_TRANSLATION_KEYS: Record<string, string> = {
  backlog: "workspace_projects.state.backlog",
  unstarted: "workspace_projects.state.unstarted",
  "un-started": "workspace_projects.state.unstarted",
  un_started: "workspace_projects.state.unstarted",
  todo: "workspace_projects.state.unstarted",
  "to do": "workspace_projects.state.unstarted",
  "in progress": "workspace_projects.state.started",
  "in-progress": "workspace_projects.state.started",
  in_progress: "workspace_projects.state.started",
  started: "workspace_projects.state.started",
  done: "workspace_projects.state.completed",
  completed: "workspace_projects.state.completed",
  cancelled: "workspace_projects.state.cancelled",
  canceled: "workspace_projects.state.cancelled",
};

export const getDefaultStateNameTranslationKey = (stateName: string) =>
  DEFAULT_STATE_NAME_TRANSLATION_KEYS[stateName.toLocaleLowerCase()];
