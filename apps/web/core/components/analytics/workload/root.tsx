/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
import useSWR from "swr";
// plane imports
import { useTranslation } from "@plane/i18n";
import { stringToEmoji } from "@plane/propel/emoji-icon-picker";
import type {
  ChartDataType,
  IAnalyticsWorkloadResponse,
  IAnalyticsWorkloadItem,
  IAnalyticsWorkloadRow,
  TGanttViews,
} from "@plane/types";
import { Avatar } from "@plane/ui";
import { cn, getDate, getFileURL } from "@plane/utils";
// hooks
import { useAnalytics } from "@/hooks/store/use-analytics";
import { useUserProfile } from "@/hooks/store/user";
// services
import { AnalyticsService } from "@/services/analytics.service";
// local imports
import { currentViewDataWithView, VIEWS_LIST } from "@/components/gantt-chart/data";
import {
  dayView,
  getItemPositionWidth,
  groupMonthsToQuarters,
  monthView,
  quarterView,
  weekView,
} from "@/components/gantt-chart/views";
import type {
  IDayHourBlock,
  IMonthBlock,
  IMonthView,
  IQuarterMonthBlock,
  IWeekBlock,
} from "@/components/gantt-chart/views";
import AnalyticsEmptyState from "../empty-state";
import AnalyticsWrapper from "../analytics-wrapper";

const analyticsService = new AnalyticsService();
const ALL_GROUPS = "all";
const SIDEBAR_WIDTH = 360;
const ROW_HEIGHT = 58;
const HEADER_HEIGHT = 48;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

const timelineViewHelpers = {
  day: dayView,
  week: weekView,
  month: monthView,
  quarter: quarterView,
};

const pipelineSegmentClassName =
  "absolute top-2.5 z-[5] flex h-9 min-w-[18px] items-center overflow-hidden rounded-sm border px-2 text-12 font-semibold shadow-raised-100";

const getWorkloadSegmentViewDetails = (status: IAnalyticsWorkloadItem["status"]): CSSProperties => {
  const statusStyles: Partial<Record<NonNullable<IAnalyticsWorkloadItem["status"]>, CSSProperties>> = {
    active: { backgroundColor: "#28d414", borderColor: "#15803d", color: "#111827" },
    completed: { backgroundColor: "#16a34a", borderColor: "#166534", color: "#ffffff" },
    pending: { backgroundColor: "#facc15", borderColor: "#ca8a04", color: "#111827" },
    skipped: { backgroundColor: "#6b7280", borderColor: "#4b5563", color: "#ffffff" },
  };

  return statusStyles[status] ?? { backgroundColor: "#2563eb", borderColor: "#1d4ed8", color: "#ffffff" };
};

const startOfDay = (date: Date) => {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
};

const daysBetween = (startDate: Date, endDate: Date) =>
  Math.round((startOfDay(endDate).getTime() - startOfDay(startDate).getTime()) / DAY_IN_MS);

const getGroupEmoji = (emoji?: string | null) => {
  if (!emoji) return null;
  const normalizedEmoji = emoji.startsWith("emoji-") ? emoji.replace(/^emoji-/, "") : emoji;
  return stringToEmoji(normalizedEmoji) || emoji;
};

const getTimelineCurrentDate = (members: IAnalyticsWorkloadRow[]) => {
  const today = startOfDay(new Date());
  const datedItems = members.flatMap((row) => row.items).filter((item) => item.start_date && item.target_date);

  const activeToday = datedItems.some((item) => {
    const itemStart = getDate(item.start_date);
    const itemEnd = getDate(item.target_date);
    return itemStart && itemEnd && startOfDay(itemStart) <= today && startOfDay(itemEnd) >= today;
  });

  if (activeToday || datedItems.length === 0) return today;

  const nearestItem = datedItems
    .map((item) => getDate(item.start_date))
    .filter((date): date is Date => !!date)
    .sort(
      (a, b) =>
        Math.abs(startOfDay(a).getTime() - today.getTime()) - Math.abs(startOfDay(b).getTime() - today.getTime())
    )[0];

  return nearestItem ? startOfDay(nearestItem) : today;
};

const getTimelineRender = (view: TGanttViews, currentDate: Date, startOfWeek?: number) => {
  const viewData = currentViewDataWithView(view);
  if (!viewData) return;

  const seed: ChartDataType = {
    ...viewData,
    data: {
      ...viewData.data,
      currentDate,
      startDate: currentDate,
      endDate: currentDate,
    },
  };

  const helper = timelineViewHelpers[view];
  return helper.generateChart(seed, null, currentDate, startOfWeek as never);
};

const WorkloadDayChartView = ({ chartData, renderView }: { chartData: ChartDataType; renderView: IDayHourBlock[] }) => (
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
            ???????
          </div>
          <div className="sticky px-3 py-2 text-11 whitespace-nowrap text-placeholder">????? ?????</div>
        </div>
        <div className="flex h-5 w-full">
          {renderView.map((hour) => (
            <div
              key={`hour-title-${hour.hour}`}
              className={cn(
                "flex flex-shrink-0 items-center justify-center p-1 text-center text-11 font-medium outline-[0.25px] outline-subtle-1",
                {
                  "bg-accent-primary/20": hour.current,
                }
              )}
              style={{ width: `${chartData.data.dayWidth}px` }}
            >
              <span className={cn({ "rounded-sm bg-accent-primary px-1 text-on-color": hour.current })}>
                {hour.title}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex h-full w-full flex-grow bg-surface-1">
        {renderView.map((hour) => (
          <div
            key={`hour-column-${hour.hour}`}
            className={cn("h-full overflow-hidden outline-[0.25px] outline-subtle", {
              "bg-accent-primary/20": hour.current,
            })}
            style={{ width: `${chartData.data.dayWidth}px` }}
          />
        ))}
      </div>
    </div>
  </div>
);

const WorkloadWeekChartView = ({ chartData, renderView }: { chartData: ChartDataType; renderView: IWeekBlock[] }) => (
  <div className="absolute top-0 left-0 flex h-max min-h-full w-max">
    {renderView.map((block, rootIndex) => (
      <div
        key={`week-${block.startDate.toString()}-${block.endDate.toString()}`}
        className="relative flex flex-col outline-[0.25px] outline-subtle-1"
      >
        <div
          className="sticky top-0 z-[5] w-full flex-shrink-0 bg-surface-1 outline-[1px] outline-subtle-1"
          style={{ height: `${HEADER_HEIGHT}px` }}
        >
          <div className="inline-flex h-7 w-full justify-between">
            <div
              className="sticky z-[1] m-1 flex items-center bg-surface-1 px-3 py-1 text-13 font-regular whitespace-nowrap text-secondary capitalize"
              style={{ left: `${SIDEBAR_WIDTH}px` }}
            >
              {block.title}
            </div>
            <div className="sticky px-3 py-2 text-11 whitespace-nowrap text-placeholder capitalize">
              {block.weekData.title}
            </div>
          </div>
          <div className="flex h-5 w-full">
            {block.children?.map((weekDay, index) => (
              <div
                key={`week-sub-title-${rootIndex}-${index}`}
                className={cn(
                  "flex flex-shrink-0 justify-between p-1 text-center capitalize outline-[0.25px] outline-subtle-1",
                  {
                    "bg-accent-primary/20": weekDay.today,
                  }
                )}
                style={{ width: `${chartData.data.dayWidth}px` }}
              >
                <div className="space-x-1 text-11 font-medium text-placeholder">{weekDay.dayData.abbreviation}</div>
                <div className="space-x-1 text-11 font-medium">
                  <span className={cn({ "rounded-sm bg-accent-primary px-1 text-on-color": weekDay.today })}>
                    {weekDay.date.getDate()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex h-full w-full flex-grow bg-surface-1">
          {block.children?.map((weekDay, index) => (
            <div
              key={`week-column-${rootIndex}-${index}`}
              className={cn("h-full overflow-hidden outline-[0.25px] outline-subtle", {
                "bg-accent-primary/20": weekDay.today,
              })}
              style={{ width: `${chartData.data.dayWidth}px` }}
            >
              {[0, 6].includes(weekDay.day) && <div className="h-full bg-surface-2 outline-[0.25px] outline-strong" />}
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

const WorkloadMonthChartView = ({ chartData, renderView }: { chartData: ChartDataType; renderView: IMonthView }) => {
  if (!renderView) return null;
  const { months, weeks } = renderView;
  if (!months.length || !weeks.length) return null;

  const monthsStartDate = new Date(months[0].year, months[0].month, 1);
  const weeksStartDate = weeks[0].startDate;
  const marginLeftDays = daysBetween(weeksStartDate, monthsStartDate);

  return (
    <div className="absolute top-0 left-0 flex h-max min-h-full w-max">
      <div className="relative flex flex-col outline-[0.25px] outline-subtle-1">
        <div className="sticky top-0 z-[5] w-full flex-shrink-0 bg-surface-1" style={{ height: `${HEADER_HEIGHT}px` }}>
          <div className="flex h-7" style={{ marginLeft: `${marginLeftDays * chartData.data.dayWidth}px` }}>
            {months.map((monthBlock) => (
              <div
                key={`month-${monthBlock.month}-${monthBlock.year}`}
                className="flex outline-[0.5px] outline-subtle-1"
                style={{ width: `${monthBlock.days * chartData.data.dayWidth}px` }}
              >
                <div
                  className="sticky z-[1] m-1 flex items-center bg-surface-1 px-3 py-1 text-14 font-regular whitespace-nowrap text-secondary capitalize"
                  style={{ left: `${SIDEBAR_WIDTH}px` }}
                >
                  {monthBlock.title}
                </div>
              </div>
            ))}
          </div>
          <div className="flex h-5 w-full">
            {weeks.map((weekBlock) => (
              <div
                key={`month-sub-title-${weekBlock.startDate.toString()}-${weekBlock.endDate.toString()}`}
                className={cn(
                  "flex flex-shrink-0 justify-between px-2 py-1 text-center capitalize outline-[0.25px] outline-subtle-1",
                  {
                    "bg-accent-primary/20": weekBlock.today,
                  }
                )}
                style={{ width: `${chartData.data.dayWidth * 7}px` }}
              >
                <div className="space-x-1 text-11 font-medium text-placeholder">
                  <span className={cn({ "rounded-sm bg-accent-primary px-1 text-on-color": weekBlock.today })}>
                    {weekBlock.startDate.getDate()}-{weekBlock.endDate.getDate()}
                  </span>
                </div>
                <div className="space-x-1 text-11 font-medium">{weekBlock.weekData.shortTitle}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex h-full w-full flex-grow">
          {weeks.map((weekBlock) => (
            <div
              key={`month-column-${weekBlock.startDate.toString()}-${weekBlock.endDate.toString()}`}
              className={cn("h-full overflow-hidden outline-[0.25px] outline-subtle", {
                "bg-accent-primary/20": weekBlock.today,
              })}
              style={{ width: `${chartData.data.dayWidth * 7}px` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const WorkloadQuarterChartView = ({
  chartData,
  renderView,
}: {
  chartData: ChartDataType;
  renderView: IMonthBlock[];
}) => {
  const quarterBlocks: IQuarterMonthBlock[] = groupMonthsToQuarters(renderView);

  return (
    <div className="absolute top-0 left-0 flex h-max min-h-full w-max">
      {quarterBlocks.map((quarterBlock, rootIndex) => (
        <div
          key={`quarter-${quarterBlock.quarterNumber}-${quarterBlock.year}`}
          className="relative flex flex-col outline-[0.25px] outline-subtle-1"
        >
          <div
            className="sticky top-0 z-[5] w-full flex-shrink-0 bg-surface-1 outline-[1px] outline-subtle-1"
            style={{ height: `${HEADER_HEIGHT}px` }}
          >
            <div className="inline-flex h-7 w-full justify-between">
              <div
                className="sticky z-[1] my-1 flex items-center bg-surface-1 px-3 py-1 text-14 font-regular whitespace-nowrap text-secondary capitalize"
                style={{ left: `${SIDEBAR_WIDTH}px` }}
              >
                {quarterBlock.title}
              </div>
              <div className="sticky px-3 py-2 text-11 whitespace-nowrap text-placeholder capitalize">
                {quarterBlock.shortTitle}
              </div>
            </div>
            <div className="flex h-5 w-full">
              {quarterBlock.children.map((monthBlock, index) => (
                <div
                  key={`quarter-sub-title-${rootIndex}-${index}`}
                  className={cn(
                    "flex flex-shrink-0 justify-center text-center capitalize outline-[0.25px] outline-subtle-1",
                    {
                      "bg-accent-primary/20": monthBlock.today,
                    }
                  )}
                  style={{ width: `${chartData.data.dayWidth * monthBlock.days}px` }}
                >
                  <div className="flex h-full items-center justify-center space-x-1 text-11 font-medium">
                    <span className={cn({ "rounded-lg bg-accent-primary px-2 text-on-color": monthBlock.today })}>
                      {monthBlock.monthData.shortTitle}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex h-full w-full flex-grow">
            {quarterBlock.children.map((monthBlock, index) => (
              <div
                key={`quarter-column-${rootIndex}-${index}`}
                className={cn("h-full overflow-hidden outline-[0.25px] outline-subtle", {
                  "bg-accent-primary/20": monthBlock.today,
                })}
                style={{ width: `${chartData.data.dayWidth * monthBlock.days}px` }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const WorkloadChartScale = ({
  currentView,
  chartData,
  renderView,
}: {
  currentView: TGanttViews;
  chartData: ChartDataType;
  renderView: unknown;
}) => {
  if (currentView === "day")
    return <WorkloadDayChartView chartData={chartData} renderView={renderView as IDayHourBlock[]} />;
  if (currentView === "week")
    return <WorkloadWeekChartView chartData={chartData} renderView={renderView as IWeekBlock[]} />;
  if (currentView === "month")
    return <WorkloadMonthChartView chartData={chartData} renderView={renderView as IMonthView} />;
  return <WorkloadQuarterChartView chartData={chartData} renderView={renderView as IMonthBlock[]} />;
};

export const Workload = observer(function Workload() {
  const { t } = useTranslation();
  const params = useParams();
  const workspaceSlug = params.workspaceSlug.toString();
  const { selectedProjects } = useAnalytics();
  const { data: userProfile } = useUserProfile();
  const chartScrollRef = useRef<HTMLDivElement>(null);
  const [selectedGroupId, setSelectedGroupId] = useState(ALL_GROUPS);
  const [currentView, setCurrentView] = useState<TGanttViews>("week");

  const { data, isLoading } = useSWR(`analytics-workload-${workspaceSlug}-${selectedProjects.join(",")}`, () =>
    analyticsService.getAdvanceAnalyticsWorkload<IAnalyticsWorkloadResponse>(workspaceSlug, {
      ...(selectedProjects?.length > 0 ? { project_ids: selectedProjects.join(",") } : {}),
    })
  );

  const groups = data?.groups ?? [];
  const members = data?.members ?? [];
  const filteredMembers = useMemo(
    () =>
      selectedGroupId === ALL_GROUPS
        ? members
        : members.filter((row) => row.groups.some((group) => group.id === selectedGroupId)),
    [members, selectedGroupId]
  );

  const timelineCurrentDate = useMemo(() => getTimelineCurrentDate(filteredMembers), [filteredMembers]);
  const timelineRender = useMemo(
    () => getTimelineRender(currentView, timelineCurrentDate, userProfile?.start_of_the_week),
    [currentView, timelineCurrentDate, userProfile?.start_of_the_week]
  );
  const chartData = timelineRender?.state;
  const renderView = timelineRender?.payload;
  const chartWidth = timelineRender?.scrollWidth ?? 0;
  const chartHeight = HEADER_HEIGHT + filteredMembers.length * ROW_HEIGHT;

  useEffect(() => {
    const scrollContainer = chartScrollRef.current;
    if (!scrollContainer || !chartData) return;

    const scrollLeft =
      daysBetween(chartData.data.startDate, timelineCurrentDate) * chartData.data.dayWidth -
      (scrollContainer.clientWidth / 2 - chartData.data.dayWidth) +
      SIDEBAR_WIDTH / 2;

    window.requestAnimationFrame(() => {
      scrollContainer.scrollLeft = Math.max(0, scrollLeft);
    });
  }, [chartData, chartWidth, currentView, timelineCurrentDate]);

  return (
    <AnalyticsWrapper i18nTitle="workspace_analytics.workload" className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={cn(
              "rounded border border-subtle px-3 py-1.5 text-13 font-medium text-secondary hover:bg-surface-2",
              selectedGroupId === ALL_GROUPS &&
                "border-custom-primary-100 bg-custom-primary-100/10 text-custom-primary-100"
            )}
            onClick={() => setSelectedGroupId(ALL_GROUPS)}
          >
            {t("common.all")}
          </button>
          {groups.map((group) => {
            const groupEmoji = getGroupEmoji(group.emoji);

            return (
              <button
                key={group.id}
                type="button"
                className={cn(
                  "inline-flex items-center gap-1.5 rounded border border-subtle px-3 py-1.5 text-13 font-medium text-secondary hover:bg-surface-2",
                  selectedGroupId === group.id &&
                    "border-custom-primary-100 bg-custom-primary-100/10 text-custom-primary-100"
                )}
                onClick={() => setSelectedGroupId(group.id)}
              >
                {groupEmoji && <span>{groupEmoji}</span>}
                <span>{group.name}</span>
              </button>
            );
          })}
        </div>

        <div className="shadow relative flex min-h-[560px] flex-1 flex-col overflow-hidden rounded-xs border-[0.5px] border-subtle bg-surface-1 select-none">
          <div className="flex h-10 flex-shrink-0 flex-wrap items-center gap-2 bg-surface-1 px-3 py-2 whitespace-nowrap">
            <div className="ml-auto text-11 font-medium text-tertiary">
              {filteredMembers.length} {t("workspace_analytics.workload_member")}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {VIEWS_LIST.map((chartView) => (
                <button
                  key={chartView.key}
                  type="button"
                  className={cn(
                    "cursor-pointer rounded-md bg-layer-transparent px-2 py-1 text-11 hover:bg-layer-transparent-hover",
                    currentView === chartView.key && "bg-layer-transparent-selected"
                  )}
                  onClick={() => setCurrentView(chartView.key as TGanttViews)}
                >
                  {t(chartView.i18n_title)}
                </button>
              ))}
            </div>
          </div>
          {isLoading ? (
            <div className="space-y-2 p-4">
              {[0, 1, 2, 3].map((item) => (
                <div key={item} className="grid grid-cols-[360px_minmax(420px,1fr)] gap-4">
                  <div className="h-10 animate-pulse rounded bg-surface-2" />
                  <div className="h-10 animate-pulse rounded bg-surface-2" />
                </div>
              ))}
            </div>
          ) : filteredMembers.length === 0 || !chartData || !renderView ? (
            <AnalyticsEmptyState
              title={t("workspace_analytics.workload_empty_title")}
              description={t("workspace_analytics.workload_empty_description")}
              className="min-h-[420px] rounded-none border-0"
            />
          ) : (
            <div
              ref={chartScrollRef}
              className="vertical-scrollbar horizontal-scrollbar scrollbar-lg h-full w-full overflow-auto border-t-[0.5px] border-subtle"
            >
              <div className="flex min-h-full w-max">
                <div
                  className="sticky left-0 z-20 shrink-0 border-r border-subtle bg-surface-1"
                  style={{ width: `${SIDEBAR_WIDTH}px` }}
                >
                  <div
                    className="sticky top-0 z-30 flex items-end border-b border-subtle bg-surface-1 px-4 py-2 text-12 font-semibold text-tertiary uppercase"
                    style={{ height: `${HEADER_HEIGHT}px` }}
                  >
                    {t("workspace_analytics.workload_member")}
                  </div>
                  {filteredMembers.map((row) => (
                    <div
                      key={row.workspace_member_id}
                      className="flex min-w-0 items-center gap-2 border-b border-subtle px-4"
                      style={{ height: `${ROW_HEIGHT}px` }}
                    >
                      <Avatar name={row.member.display_name} src={getFileURL(row.member.avatar_url ?? "")} size="sm" />
                      <div className="min-w-0">
                        <div className="truncate text-13 font-medium text-primary">{row.member.display_name}</div>
                        <div className="truncate text-12 text-tertiary">{row.member.email}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div
                  className="relative h-max min-h-full flex-shrink-0 flex-grow"
                  style={{ width: `${chartWidth}px`, height: `${chartHeight}px` }}
                >
                  <WorkloadChartScale currentView={currentView} chartData={chartData} renderView={renderView} />
                  <div
                    className="relative h-full"
                    style={{
                      width: `${chartWidth}px`,
                      transform: `translateY(${HEADER_HEIGHT}px)`,
                      paddingBottom: `${HEADER_HEIGHT}px`,
                    }}
                  >
                    {filteredMembers.map((row) => (
                      <div
                        key={row.workspace_member_id}
                        className="relative border-b border-subtle"
                        style={{ height: `${ROW_HEIGHT}px` }}
                      >
                        {row.items.map((item, itemIndex) => {
                          const position = getItemPositionWidth(chartData, {
                            id: item.id,
                            start_date: item.start_date,
                            target_date: item.target_date,
                            target_time: "00:00",
                            data: item,
                          } as never);
                          const segmentStyle = getWorkloadSegmentViewDetails(item.status);

                          if (!position) return null;

                          return (
                            <div
                              key={`${row.workspace_member_id}-${item.id}-${itemIndex}`}
                              className={pipelineSegmentClassName}
                              style={{
                                ...segmentStyle,
                                left: `${position.marginLeft}px`,
                                width: `${Math.max(60, position.width)}px`,
                                zIndex: 5 + itemIndex,
                              }}
                              title={`${item.issue_name} - ${item.pipeline_name}`}
                            >
                              <span className="truncate">{item.issue_name}</span>
                            </div>
                          );
                        })}
                        <div className="pointer-events-none sticky left-0 z-[2] mt-1 ml-3 inline-flex rounded bg-surface-1/80 px-1.5 py-0.5 text-11 font-medium text-tertiary backdrop-blur-sm">
                          {t("workspace_analytics.workload_days", { count: row.workload })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AnalyticsWrapper>
  );
});
