/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { ChartDataType } from "@plane/types";
import { hourPreview } from "../data";

export interface IDayHourBlock {
  hour: number;
  title: string;
  current: boolean;
}

const normalizeDay = (date: Date) => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

const generateDayChart = (dayPayload: ChartDataType, _side: null | "left" | "right", targetDate?: Date) => {
  const currentDate = targetDate ?? new Date();
  const startDate = normalizeDay(currentDate);
  const endDate = new Date(startDate);
  endDate.setHours(23, 59, 59, 999);

  const currentHour = new Date().getHours();
  const isToday = normalizeDay(new Date()).getTime() === startDate.getTime();

  const payload: IDayHourBlock[] = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    title: hourPreview(hour),
    current: isToday && hour === currentHour,
  }));

  const state: ChartDataType = {
    ...dayPayload,
    data: {
      ...dayPayload.data,
      currentDate,
      startDate,
      endDate,
    },
  };

  return { state, payload, scrollWidth: payload.length * dayPayload.data.dayWidth };
};

const mergeDayRenderPayloads = (a: IDayHourBlock[], b: IDayHourBlock[]) => [...a, ...b];

export const dayView = {
  generateChart: generateDayChart,
  mergeRenderPayloads: mergeDayRenderPayloads,
};
