import React, { useCallback, useEffect, useMemo, useState } from "react";
import { observer } from "mobx-react";
import { CheckCircle2, Circle, CircleDot, FastForward } from "lucide-react";
import { useTranslation } from "@plane/i18n";
import { StartDatePropertyIcon, DueDatePropertyIcon } from "@plane/propel/icons";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import { Tooltip } from "@plane/propel/tooltip";
import type { TIssueComment } from "@plane/types";
import { CircularProgressIndicator, Collapsible, CollapsibleButton } from "@plane/ui";
import { cn, getDate, renderFormattedPayloadDate } from "@plane/utils";
import { CommentCreate } from "@/components/comments/comment-create";
import { CommentCard } from "@/components/comments/card/root";
import { DateDropdown } from "@/components/dropdowns/date";
import { MemberDropdown } from "@/components/dropdowns/member/dropdown";
import { useWorkItemCommentOperations } from "@/components/issues/issue-detail/issue-activity/helper";
import { useIssueDetail } from "@/hooks/store/use-issue-detail";
import { usePlatformOS } from "@/hooks/use-platform-os";
import { IssueService } from "@/services/issue";
import { ISSUE_PIPELINE_UPDATED } from "./events";
import { getPipelineErrorMessage } from "./error-message";

type PipelineItem = {
  id: string;
  name?: string;
  state_name_snapshot: string;
  status: "pending" | "active" | "completed" | "skipped";
  auto_completed: boolean;
  start_date?: string | null;
  target_date?: string | null;
  target_time?: string | null;
  assignee_ids?: string[];
};

type Props = {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  disabled?: boolean;
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
  item: PipelineItem;
  disabled: boolean;
  isLoading: boolean;
  onComplete: () => void;
}) {
  const { t } = useTranslation();
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
      title={isActive ? t("issue.pipeline.complete_active_step") : t("issue.pipeline.only_active_step_can_be_completed")}
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
  const { workspaceSlug, projectId, issueId, disabled = false } = props;
  const { t } = useTranslation();
  const issueService = useMemo(() => new IssueService(), []);
  const activityOperations = useWorkItemCommentOperations(workspaceSlug, projectId, issueId);
  const { isMobile } = usePlatformOS();
  const {
    comment: { getCommentById, getCommentsByIssueId },
    issue: { getIssueById },
  } = useIssueDetail();
  const parentIssue = getIssueById(issueId);
  const [items, setItems] = useState<PipelineItem[]>([]);
  const [isOpen, setIsOpen] = useState(() => typeof window !== "undefined" && window.location.hash === "#pipeline");
  const [isLoading, setIsLoading] = useState(false);
  const [expandedItemIds, setExpandedItemIds] = useState<Set<string>>(() => new Set());

  const fetchPipeline = useCallback(async () => {
    const nextItems = await issueService.getIssuePipeline(workspaceSlug, projectId, issueId);
    setItems(nextItems ?? []);
  }, [issueId, issueService, projectId, workspaceSlug]);

  useEffect(() => {
    fetchPipeline();
  }, [fetchPipeline]);

  useEffect(() => {
    setExpandedItemIds((currentIds) => {
      const nextIds = new Set(currentIds);
      items.forEach((item) => {
        if (item.status === "active") nextIds.add(item.id);
      });
      return nextIds;
    });
  }, [items]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (!detail?.issueId || detail.issueId === issueId) {
        setIsOpen(true);
        fetchPipeline();
      }
    };
    window.addEventListener(ISSUE_PIPELINE_UPDATED, handler);
    return () => window.removeEventListener(ISSUE_PIPELINE_UPDATED, handler);
  }, [fetchPipeline, issueId]);

  if (!items.length) return null;

  const completedCount = items.filter((item) => item.status === "completed").length;
  const percentage = completedCount && items.length ? (completedCount / items.length) * 100 : 0;
  const hasOverduePipelineItem = items.some((item) => item.status !== "completed" && isDateOverdue(item.target_date));
  const finalPipelineItem = items[items.length - 1];
  const isFinalPipelineOverdue =
    finalPipelineItem?.status !== "completed" && isDateOverdue(finalPipelineItem?.target_date);
  const isParentDeadlineOverdue = isDateOverdue(parentIssue?.target_date);

  const completeItem = async (item: PipelineItem) => {
    if (disabled || isLoading || item.status !== "active") return;
    setIsLoading(true);
    try {
      await issueService.completeIssuePipelineItem(workspaceSlug, projectId, issueId, item.id);
      await fetchPipeline();
      window.dispatchEvent(new CustomEvent(ISSUE_PIPELINE_UPDATED, { detail: { issueId } }));
    } finally {
      setIsLoading(false);
    }
  };

  const updatePipelineItem = async (item: PipelineItem, data: Record<string, unknown>) => {
    if (disabled || isLoading) return;
    setIsLoading(true);
    try {
      await issueService.updateIssuePipelineItem(workspaceSlug, projectId, issueId, item.id, data);
      await fetchPipeline();
      window.dispatchEvent(new CustomEvent(ISSUE_PIPELINE_UPDATED, { detail: { issueId } }));
    } catch (error: any) {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: t("common.error.label"),
        message: getPipelineErrorMessage(t, error),
      });
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
            title={t("issue.pipeline.label")}
            indicatorElement={
              <div className="flex items-center gap-1.5 text-13 text-tertiary">
                <CircularProgressIndicator size={18} percentage={percentage} strokeWidth={3} />
                <span>
                  {completedCount}/{items.length} {t("common.done")}
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
            const itemComments = (getCommentsByIssueId(issueId) ?? [])
              .map((commentId) => getCommentById(commentId))
              .filter((comment): comment is TIssueComment => comment?.pipeline_item === item.id);

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
                    <Tooltip tooltipContent={itemName} isMobile={isMobile}>
                      <span className="w-0 flex-1 truncate text-13 text-primary">{itemName}</span>
                    </Tooltip>
                  </div>

                  <div className="flex flex-shrink-0 items-center gap-2 text-13" onClick={(event) => event.stopPropagation()}>
                    <div className="h-5">
                      <DateDropdown
                        value={item.start_date ?? null}
                        onChange={(date) =>
                          updatePipelineItem(item, {
                            start_date: date ? renderFormattedPayloadDate(date) : null,
                          })
                        }
                        maxDate={getDate(item.target_date)}
                        placeholder={t("common.order_by.start_date")}
                        icon={<StartDatePropertyIcon className="h-3 w-3 flex-shrink-0" />}
                        buttonVariant={item.start_date ? "border-with-text" : "border-without-text"}
                        optionsClassName="z-30"
                        disabled={disabled || isLoading}
                        showTooltip
                      />
                    </div>
                    <div className="h-5">
                      <DateDropdown
                        value={item.target_date ?? null}
                        onChange={(date) =>
                          updatePipelineItem(item, {
                            target_date: date ? renderFormattedPayloadDate(date) : null,
                            ...(date ? {} : { target_time: null }),
                          })
                        }
                        minDate={getDate(item.start_date)}
                        placeholder={t("common.order_by.due_date")}
                        icon={<DueDatePropertyIcon className="h-3 w-3 flex-shrink-0" />}
                        buttonVariant={item.target_date ? "border-with-text" : "border-without-text"}
                        buttonClassName={isItemOverdue ? "text-danger-primary" : ""}
                        clearIconClassName="text-primary"
                        optionsClassName="z-30"
                        disabled={disabled || isLoading}
                        showTooltip
                        selectedLabelSuffix={targetTimeLabel}
                        showTimeInput
                        timeInputLabel={t("common.due_time")}
                        timeValue={item.target_time}
                        onTimeChange={(time) => updatePipelineItem(item, { target_time: time })}
                      />
                    </div>
                    <div className="h-5 flex-shrink-0">
                      <MemberDropdown
                        value={item.assignee_ids ?? []}
                        projectId={projectId}
                        onChange={(assigneeIds) => updatePipelineItem(item, { assignee_ids: assigneeIds })}
                        disabled={disabled || isLoading}
                        multiple
                        buttonVariant={(item.assignee_ids || []).length > 0 ? "transparent-without-text" : "border-without-text"}
                        buttonClassName={(item.assignee_ids || []).length > 0 ? "hover:bg-transparent px-0" : ""}
                      />
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
                    {itemComments.length > 0 && (
                      <div className="space-y-2 border-t border-custom-border-100 pt-2">
                        {itemComments.map((comment, index) => (
                          <CommentCard
                            key={comment.id}
                            workspaceSlug={workspaceSlug}
                            entityId={issueId}
                            comment={comment}
                            activityOperations={activityOperations}
                            ends={index === 0 ? "top" : index === itemComments.length - 1 ? "bottom" : undefined}
                            showAccessSpecifier={false}
                            showCopyLinkOption
                            disabled={disabled}
                            projectId={projectId}
                            enableReplies
                          />
                        ))}
                      </div>
                    )}
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
