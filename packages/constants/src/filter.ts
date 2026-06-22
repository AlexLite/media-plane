/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

export enum E_SORT_ORDER {
  ASC = "asc",
  DESC = "desc",
}
export const DATE_AFTER_FILTER_OPTIONS = [
  {
    name: "через 1 неделю",
    value: "1_weeks;after;fromnow",
  },
  {
    name: "через 2 недели",
    value: "2_weeks;after;fromnow",
  },
  {
    name: "через 1 месяц",
    value: "1_months;after;fromnow",
  },
  {
    name: "через 2 месяца",
    value: "2_months;after;fromnow",
  },
];

export const DATE_BEFORE_FILTER_OPTIONS = [
  {
    name: "1 неделю назад",
    value: "1_weeks;before;fromnow",
  },
  {
    name: "2 недели назад",
    value: "2_weeks;before;fromnow",
  },
  {
    name: "1 месяц назад",
    i18n_name: "date_filters.1_month_ago",
    value: "1_months;before;fromnow",
  },
];

export const PROJECT_CREATED_AT_FILTER_OPTIONS = [
  {
    name: "Сегодня",
    value: "today;custom;custom",
  },
  {
    name: "Вчера",
    value: "yesterday;custom;custom",
  },
  {
    name: "Последние 7 дней",
    value: "last_7_days;custom;custom",
  },
  {
    name: "Последние 30 дней",
    value: "last_30_days;custom;custom",
  },
];
