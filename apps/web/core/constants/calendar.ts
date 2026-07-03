/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { TCalendarLayouts } from "@plane/types";
import { EStartOfTheWeek } from "@plane/types";

export const MONTHS_LIST: {
  [monthNumber: number]: {
    shortTitle: string;
    title: string;
  };
} = {
  1: {
    shortTitle: "Янв",
    title: "Январь",
  },
  2: {
    shortTitle: "Фев",
    title: "Февраль",
  },
  3: {
    shortTitle: "Мар",
    title: "Март",
  },
  4: {
    shortTitle: "Апр",
    title: "Апрель",
  },
  5: {
    shortTitle: "Май",
    title: "Май",
  },
  6: {
    shortTitle: "Июн",
    title: "Июнь",
  },
  7: {
    shortTitle: "Июл",
    title: "Июль",
  },
  8: {
    shortTitle: "Авг",
    title: "Август",
  },
  9: {
    shortTitle: "Сен",
    title: "Сентябрь",
  },
  10: {
    shortTitle: "Окт",
    title: "Октябрь",
  },
  11: {
    shortTitle: "Ноя",
    title: "Ноябрь",
  },
  12: {
    shortTitle: "Дек",
    title: "Декабрь",
  },
};

export const DAYS_LIST: {
  [dayIndex: number]: {
    shortTitle: string;
    title: string;
    value: EStartOfTheWeek;
  };
} = {
  1: {
    shortTitle: "Вс",
    title: "Воскресенье",
    value: EStartOfTheWeek.SUNDAY,
  },
  2: {
    shortTitle: "Пн",
    title: "Понедельник",
    value: EStartOfTheWeek.MONDAY,
  },
  3: {
    shortTitle: "Вт",
    title: "Вторник",
    value: EStartOfTheWeek.TUESDAY,
  },
  4: {
    shortTitle: "Ср",
    title: "Среда",
    value: EStartOfTheWeek.WEDNESDAY,
  },
  5: {
    shortTitle: "Чт",
    title: "Четверг",
    value: EStartOfTheWeek.THURSDAY,
  },
  6: {
    shortTitle: "Пт",
    title: "Пятница",
    value: EStartOfTheWeek.FRIDAY,
  },
  7: {
    shortTitle: "Сб",
    title: "Суббота",
    value: EStartOfTheWeek.SATURDAY,
  },
};

export const CALENDAR_LAYOUTS: {
  [layout in TCalendarLayouts]: {
    key: TCalendarLayouts;
  };
} = {
  day: {
    key: "day",
  },
  month: {
    key: "month",
  },
  week: {
    key: "week",
  },
};
