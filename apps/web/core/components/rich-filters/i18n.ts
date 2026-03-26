/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

type TTranslate = (key: string) => string;

const FILTER_LABEL_KEY_MAP: Record<string, string> = {
  State: "common.state",
  "State Group": "common.state_group",
  Assignees: "common.assignees",
  Priority: "common.priority",
  Mentions: "mentions",
  Label: "common.label",
  "Start date": "common.start_date",
  "Target date": "common.target_date",
  "Created at": "common.created_at",
  "Updated at": "common.updated_at",
  "Created by": "common.created_by",
  Cycle: "common.cycle",
  Module: "common.module",
};

export const translateFilterLabel = (t: TTranslate, label: string) => {
  const key = FILTER_LABEL_KEY_MAP[label];
  return key ? t(key) : label;
};
