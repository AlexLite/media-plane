/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

type TTranslate = (key: string) => string;

const OPERATOR_LABEL_KEY_MAP: Record<string, string> = {
  is: "rich_filters.operators.is",
  "is any of": "rich_filters.operators.is_any_of",
  between: "rich_filters.operators.between",
};

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

export const translateOperatorLabel = (t: TTranslate, label: string) => {
  const normalizedLabel = label.trim();
  const key = OPERATOR_LABEL_KEY_MAP[normalizedLabel.toLowerCase()];

  return key ? t(key) : normalizedLabel;
};

export const translateFilterLabel = (t: TTranslate, label: string) => {
  const normalizedLabel = label.trim();
  const key =
    FILTER_LABEL_KEY_MAP[normalizedLabel] ??
    FILTER_LABEL_KEY_MAP[
      normalizedLabel
        .toLowerCase()
        .replace(/\s+/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
    ];

  if (key) return t(key);
  if (normalizedLabel.includes(".")) return t(normalizedLabel);
  return normalizedLabel;
};
