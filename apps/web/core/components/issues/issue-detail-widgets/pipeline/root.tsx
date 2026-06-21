import React, { useMemo, useState } from "react";
import { observer } from "mobx-react";
import { CheckCircle2, Circle, CircleDot, FastForward } from "lucide-react";
import { Tooltip } from "@plane/propel/tooltip";
import type { TIssueComment, TIssuePipelineItem } from "@plane/types";
import { CircularProgressIndicator, Collapsible, CollapsibleButton } from "@plane/ui";
import { cn, getDate, renderFormattedPayloadDate } from "@plane/utils";
import { CommentCreate } from "@/components/comments/comment-create";
import { useWorkItemCommentOperations } from "@/components/issues/issue-detail/issue-activity/helper";
import { ISSUE_PIPELINE_UPDATED } from "./events";

type IssueDetailLite = {
  target_date?: string | null;
};

type Props = {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  disabled?: boolean;
  items?: TIssuePipelineItem[];
  parentIssue?: IssueDetailLite | null;
  onCompleteItem?: (itemId: string) => Promise<void> | void;
  onRefresh?: () => Promise<void> | void;
};

function isDateOverdue(date: string | null | undefined) {
  if (!date) return false;
  const target = getDate(date);
  if (!target) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return target < today;
}

function PipelineStatusButton({
  item,
  disabled,
  isLoading,
  onComplete,
}: {
  item: TIssuePipelineItem;
  disabled: boolean;
  isLoading: boolean;
  onComplete: () => void;
}) {
  const isActive = item.status === "active";

  return (
    <button
      type="button"
      className={cn(
        "flex size-5 flex-shrink-0 items-center justify-center rounded-xs text-placeholder transition-all hover:bg-layer-1 hover:text-tertiary",
        {
          "cursor-not-allowed opacity-60": disabled || isLoading || !isActive,
          "cursor-pointer": !disabled && !isLoading && isActive,
        }
      )}
      disabled={disabled || isLoading || !isActive}
      title={isActive ? "Complete active step" : "Only the active step can be completed"}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onComplete();
      }}
    >
      {item.status === "completed" ? (
        <CheckCircle2 className="size-4 text-green-500" />
      ) : item.status === "active" ? (
        <CircleDot className="size-4 text-blue-500" />
      ) : (
        <Circle className="size-4 text-custom-text-300" />
      )}
    </button>
  );
}

export const PipelineCollapsible = observer(function PipelineCollapsible(props: Props) {
  const {
    workspaceSlug,
    projectId,
    issueId,
    disabled = false,
    items = [],
    parentIssue,
    onCompleteItem,
    onRefresh,
  } = props;
  const activityOperations = useWorkItemCommentOperations(workspaceSlug, projectId, issueId);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedItemIds, setExpandedItemIds] = useState<Set<string>>(() => new Set());
  const [isOpen, setIsOpen] = useState(false);
  const [eventId] = useState(ISSUE_PIPELINE_UPDATED);

  const completedCount = useMemo(() => items.filter((item) => item.status === "completed").length, [items]);
  const percentage = completedCount && items.length ? (completedCount / items.length) * 100 : 0;
  const hasOverduePipelineItem = items.some((item) => item.status !== "completed" && isDateOverdue(item.target_date));
  const finalPipelineItem = items[items.length - 1];
  const isFinalPipelineOverdue =
    finalPipelineItem?.status !== "completed" && isDateOverdue(finalPipelineItem?.target_date);
  const isParentDeadlineOverdue = isDateOverdue(parentIssue?.target_date);

  if (!items.length) return null;

  const completeItem = async (item: TIssuePipelineItem) => {
    if (disabled || isLoading || item.status !== "active") return;
    setIsLoading(true);
    try {
      await onCompleteItem?.(item.id);
      await onRefresh?.();
    } finally {
      setIsLoading(false);
    }
  };

  const toggleExpandedItem = (itemId: string) => {
    setExpandedItemIds((currentIds) => {
      const nextIds = new Set(currentIds);
      if (nextIds.has(itemId)) {
        nextIds.delete(itemId);
      } else {
        nextIds.add(itemId);
      }
      return nextIds;
    });
  };

  return (
    <div
      id="issue-pipeline-section"
      data-pipeline-event={eventId}
      className={cn("rounded-sm transition-colors", {
        "bg-red-500/10": hasOverduePipelineItem || isFinalPipelineOverdue,
        "bg-red-500/20": isParentDeadlineOverdue,
      })}
    >
      <Collapsible
        isOpen={isOpen}
        onToggle={() => setIsOpen((value) => !value)}
        buttonClassName="w-full"
        title={
          <CollapsibleButton
            isOpen={isOpen}
            title="Pipeline"
            indicatorElement={
              <div className="flex items-center gap-1.5 text-13 text-tertiary">
                <CircularProgressIndicator size={18} percentage={percentage} strokeWidth={3} />
                <span>
                  {completedCount}/{items.length} Done
                </span>
              </div>
            }
          />
        }
      >
        <div className="relative">
          {items.map((item) => {
            const itemName = item.name || item.state_name_snapshot;
            const isItemOverdue = isDateOverdue(item.target_date);
            const isActiveItem = item.status === "active";
            const isExpanded = expandedItemIds.has(item.id);
            const targetTimeLabel = item.target_time ? ` ${item.target_time.slice(0, 5)}` : "";

            return (
              <div
                key={item.id}
                className={cn("transition-all", {
                  "bg-orange-500/25": isItemOverdue,
                })}
              >
                <div
                  className={cn(
                    "group relative flex h-full min-h-9 w-full cursor-pointer items-center py-0.5 pr-2 transition-all hover:bg-surface-2",
                    {
                      "bg-[#28d414]/25 hover:bg-[#28d414]/30": isActiveItem && !isItemOverdue,
                      "bg-orange-500/25 hover:bg-orange-500/30": isItemOverdue,
                    }
                  )}
                  onClick={() => toggleExpandedItem(item.id)}
                >
                  <div className="flex size-5 flex-shrink-0 items-center justify-center">
                    <PipelineStatusButton
                      item={item}
                      disabled={disabled}
                      isLoading={isLoading}
                      onComplete={() => completeItem(item)}
                    />
                  </div>

                  <div className="flex w-full items-center gap-3 truncate pl-1">
                    <Tooltip tooltipContent={itemName}>
                      <span className="w-0 flex-1 truncate text-13 text-primary">{itemName}</span>
                    </Tooltip>
                  </div>

                  <div className="flex flex-shrink-0 items-center gap-2 text-13" onClick={(event) => event.stopPropagation()}>
                    <div className="text-xs text-tertiary">
                      {item.start_date ? `Start date: ${renderFormattedPayloadDate(item.start_date)}` : null}
                      {item.target_date ? ` - Due date: ${renderFormattedPayloadDate(item.target_date)}${targetTimeLabel}` : null}
                    </div>
                  </div>

                  {item.auto_completed && (
                    <div className="ml-2 flex flex-shrink-0 items-center rounded border border-custom-border-200 px-1.5 py-0.5 text-xs text-custom-text-200">
                      <FastForward className="h-3 w-3" />
                    </div>
                  )}
                </div>

                {isExpanded && !disabled && (
                  <div className="space-y-2 pl-6 pr-2 pb-2" onClick={(event) => event.stopPropagation()}>
                    <div className="bg-surface-1/60">
                      <CommentCreate
                        workspaceSlug={workspaceSlug}
                        entityId={issueId}
                        activityOperations={activityOperations}
                        showToolbarInitially
                        projectId={projectId}
                        extraData={{ pipeline_item: item.id } as Partial<TIssueComment>}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Collapsible>
    </div>
  );
});
