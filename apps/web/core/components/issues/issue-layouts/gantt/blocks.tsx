/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import { useParams } from "next/navigation";
// plane imports
import { Popover } from "@plane/propel/popover";
import { Tooltip } from "@plane/propel/tooltip";
import type { TIssuePipelineGanttItem } from "@plane/types";
import { ControlLink } from "@plane/ui";
import { cn, findTotalDaysInRange, generateWorkItemLink, getDate } from "@plane/utils";
// components
import { SIDEBAR_WIDTH } from "@/components/gantt-chart/constants";
// hooks
import { useIssueDetail } from "@/hooks/store/use-issue-detail";
import { useIssues } from "@/hooks/store/use-issues";
import { useProject } from "@/hooks/store/use-project";
import { useProjectState } from "@/hooks/store/use-project-state";
import { useIssueStoreType } from "@/hooks/use-issue-layout-store";
import useIssuePeekOverviewRedirection from "@/hooks/use-issue-peek-overview-redirection";
import { usePlatformOS } from "@/hooks/use-platform-os";
// plane web imports
import { IssueIdentifier } from "@/plane-web/components/issues/issue-details/issue-identifier";
import { IssueStats } from "@/plane-web/components/issues/issue-layouts/issue-stats";
// local imports
import { WorkItemPreviewCard } from "../../preview-card";
import { getBlockViewDetails, getIssueOverdueBackgroundStyle } from "../utils";
import type { GanttStoreType } from "./base-gantt-root";

type Props = {
  issueId: string;
  isEpic?: boolean;
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const startOfDay = (date: Date) => {
  const newDate = new Date(date);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
};

const getPipelineSegmentPosition = (
  issueStartDate: string | null | undefined,
  issueTargetDate: string | null | undefined,
  pipelineStartDate: string | null,
  pipelineTargetDate: string | null
) => {
  const issueStart = getDate(issueStartDate);
  const issueTarget = getDate(issueTargetDate);
  const pipelineStart = getDate(pipelineStartDate);
  const pipelineTarget = getDate(pipelineTargetDate);

  if (!issueStart || !issueTarget || !pipelineStart || !pipelineTarget) return;

  const parentStart = startOfDay(issueStart);
  const parentEnd = startOfDay(issueTarget);
  const segmentStart = startOfDay(pipelineStart);
  const segmentEnd = startOfDay(pipelineTarget);

  if (parentEnd < parentStart || segmentEnd < segmentStart) return;

  const clampedStart = new Date(Math.max(parentStart.getTime(), segmentStart.getTime()));
  const clampedEnd = new Date(Math.min(parentEnd.getTime(), segmentEnd.getTime()));

  if (clampedEnd < clampedStart) return;

  const totalDays = Math.max(1, Math.round((parentEnd.getTime() - parentStart.getTime()) / DAY_IN_MS) + 1);
  const leftDays = Math.max(0, Math.round((clampedStart.getTime() - parentStart.getTime()) / DAY_IN_MS));
  const widthDays = Math.max(1, Math.round((clampedEnd.getTime() - clampedStart.getTime()) / DAY_IN_MS) + 1);

  return {
    left: `${(leftDays / totalDays) * 100}%`,
    width: `${(widthDays / totalDays) * 100}%`,
  };
};

const pipelineSegmentClassName = (status: TIssuePipelineGanttItem["status"]) =>
  cn("absolute inset-y-0 min-w-[2px] overflow-hidden border-l border-white/50", {
    "bg-[#28d414]/25": status === "active",
    "bg-green-700/20": status === "completed",
    "bg-yellow-500/20": status === "pending",
    "bg-gray-600/20": status === "skipped",
  });

export const IssueGanttBlock = observer(function IssueGanttBlock(props: Props) {
  const { issueId, isEpic } = props;
  // router
  const { workspaceSlug: routerWorkspaceSlug } = useParams();
  const workspaceSlug = routerWorkspaceSlug?.toString();
  // store hooks
  const { getProjectStates } = useProjectState();
  const {
    issue: { getIssueById },
  } = useIssueDetail();
  // hooks
  const { isMobile } = usePlatformOS();
  const { handleRedirection } = useIssuePeekOverviewRedirection(isEpic);

  // derived values
  const issueDetails = getIssueById(issueId);
  const stateDetails =
    issueDetails && getProjectStates(issueDetails?.project_id)?.find((state) => state?.id == issueDetails?.state_id);

  const { blockStyle } = getBlockViewDetails(issueDetails, stateDetails?.color ?? "");

  const handleIssuePeekOverview = () => handleRedirection(workspaceSlug, issueDetails, isMobile);

  const duration = findTotalDaysInRange(issueDetails?.start_date, issueDetails?.target_date) || 0;
  const pipelineGanttItems =
    issueDetails?.pipeline_gantt_items?.filter((item) => item.start_date && item.target_date) ?? [];
  return (
    <Popover delay={100} openOnHover>
      <Popover.Button
        className="w-full"
        render={
          <div
            id={`issue-${issueId}`}
            className="space-between relative flex h-full w-full cursor-pointer items-stretch rounded-sm"
            style={blockStyle}
            onClick={handleIssuePeekOverview}
          >
            <div className="absolute top-0 left-0 h-full w-full bg-surface-1/50" />
            {pipelineGanttItems.length > 0 && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-5 overflow-hidden rounded-b-sm">
                {pipelineGanttItems.map((item) => {
                  const position = getPipelineSegmentPosition(
                    issueDetails?.start_date,
                    issueDetails?.target_date,
                    item.start_date,
                    item.target_date
                  );

                  if (!position) return null;

                  return (
                    <div
                      key={item.id}
                      className={pipelineSegmentClassName(item.status)}
                      style={position}
                      title={item.name}
                    >
                      <span className="block truncate px-1.5 py-0.5 text-[10px] leading-4 font-medium text-primary/70">
                        {item.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            <div
              className="sticky z-[2] mt-auto w-auto flex-1 truncate overflow-hidden px-2.5 pt-1 pb-5 text-13 text-primary"
              style={{ left: `${SIDEBAR_WIDTH}px` }}
            >
              {issueDetails?.name}
            </div>
            {isEpic && (
              <IssueStats
                issueId={issueId}
                className="sticky z-[2] mx-2 w-auto flex-shrink-0 justify-end truncate overflow-hidden font-medium text-primary"
                showProgressText={duration >= 2}
              />
            )}
          </div>
        }
      />
      <Popover.Panel side="bottom" align="start">
        <>
          {issueDetails && issueDetails?.project_id && (
            <WorkItemPreviewCard
              projectId={issueDetails.project_id}
              stateDetails={{
                id: issueDetails.state_id ?? undefined,
              }}
              workItem={issueDetails}
            />
          )}
        </>
      </Popover.Panel>
    </Popover>
  );
});

// rendering issues on gantt sidebar
export const IssueGanttSidebarBlock = observer(function IssueGanttSidebarBlock(props: Props) {
  const { issueId, isEpic = false } = props;
  // router
  const { workspaceSlug: routerWorkspaceSlug } = useParams();
  const workspaceSlug = routerWorkspaceSlug?.toString();
  // store hooks
  const {
    issue: { getIssueById },
  } = useIssueDetail();
  const { isMobile } = usePlatformOS();
  const storeType = useIssueStoreType() as GanttStoreType;
  const { issuesFilter } = useIssues(storeType);
  const { getProjectIdentifierById } = useProject();

  // handlers
  const { handleRedirection } = useIssuePeekOverviewRedirection(isEpic);

  // derived values
  const issueDetails = getIssueById(issueId);
  const projectIdentifier = getProjectIdentifierById(issueDetails?.project_id);
  const overdueBackgroundStyle = getIssueOverdueBackgroundStyle(issueDetails);

  const handleIssuePeekOverview = (e: any) => {
    e.stopPropagation(true);
    e.preventDefault();
    handleRedirection(workspaceSlug, issueDetails, isMobile);
  };

  const workItemLink = generateWorkItemLink({
    workspaceSlug,
    projectId: issueDetails?.project_id,
    issueId,
    projectIdentifier,
    sequenceId: issueDetails?.sequence_id,
    isEpic,
  });

  return (
    <ControlLink
      id={`issue-${issueId}`}
      href={workItemLink}
      onClick={handleIssuePeekOverview}
      className="line-clamp-1 w-full cursor-pointer text-13 text-primary"
      disabled={!!issueDetails?.tempId}
    >
      <div
        className="relative flex h-full w-full cursor-pointer items-center gap-2 px-2"
        style={overdueBackgroundStyle}
      >
        {issueDetails?.project_id && (
          <IssueIdentifier
            issueId={issueDetails.id}
            projectId={issueDetails.project_id}
            size="xs"
            variant="tertiary"
            displayProperties={issuesFilter?.issueFilters?.displayProperties}
          />
        )}
        <Tooltip tooltipContent={issueDetails?.name} isMobile={isMobile}>
          <span className="flex-grow truncate text-13 font-medium">{issueDetails?.name}</span>
        </Tooltip>
      </div>
    </ControlLink>
  );
});
