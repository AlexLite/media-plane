/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import { cn } from "@plane/utils";
import { useTimeLineChartStore } from "@/hooks/use-timeline-chart";
import { HEADER_HEIGHT, SIDEBAR_WIDTH } from "../../constants";
import type { IDayHourBlock } from "../../views";

export const DayChartView = observer(function DayChartView() {
  const { currentViewData, renderView } = useTimeLineChartStore();
  const hourBlocks: IDayHourBlock[] = renderView;

  return (
    <div className="absolute top-0 left-0 flex h-max min-h-full w-max">
      <div className="relative flex flex-col outline-[0.25px] outline-subtle-1">
        <div
          className="sticky top-0 z-[5] w-full flex-shrink-0 bg-surface-1 outline-[1px] outline-subtle-1"
          style={{ height: `${HEADER_HEIGHT}px` }}
        >
          <div className="inline-flex h-7 w-full justify-between">
            <div
              className="sticky z-[1] m-1 flex items-center bg-surface-1 px-3 py-1 text-13 font-regular whitespace-nowrap text-secondary"
              style={{ left: `${SIDEBAR_WIDTH}px` }}
            >
              Сегодня
            </div>
            <div className="sticky px-3 py-2 text-11 whitespace-nowrap text-placeholder">
              Шкала часов
            </div>
          </div>
          <div className="flex h-5 w-full">
            {hourBlocks.map((hour) => (
              <div
                key={`hour-title-${hour.hour}`}
                className={cn(
                  "flex flex-shrink-0 items-center justify-center p-1 text-center text-11 font-medium outline-[0.25px] outline-subtle-1",
                  {
                    "bg-accent-primary/20": hour.current,
                  }
                )}
                style={{ width: `${currentViewData?.data.dayWidth}px` }}
              >
                <span
                  className={cn({
                    "rounded-sm bg-accent-primary px-1 text-on-color": hour.current,
                  })}
                >
                  {hour.title}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex h-full w-full flex-grow bg-surface-1">
          {hourBlocks.map((hour) => (
            <div
              key={`hour-column-${hour.hour}`}
              className={cn("h-full overflow-hidden outline-[0.25px] outline-subtle", {
                "bg-accent-primary/20": hour.current,
              })}
              style={{ width: `${currentViewData?.data.dayWidth}px` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
});
