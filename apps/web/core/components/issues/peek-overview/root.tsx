/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useState, useMemo, useCallback, useEffect } from "react";
import { observer } from "mobx-react";
import { usePathname } from "next/navigation";
// Plane imports
import useSWR from "swr";
import { EUserPermissions, EUserPermissionsLevel } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { TOAST_TYPE, setPromiseToast, setToast } from "@plane/propel/toast";
import type { IWorkItemPeekOverview, TIssue } from "@plane/types";
import { EIssueServiceType, EIssuesStoreType } from "@plane/types";
// hooks
import { useIssueDetail } from "@/hooks/store/use-issue-detail";
import { useIssues } from "@/hooks/store/use-issues";
import { useUserPermissions } from "@/hooks/store/user";
import { useIssueStoreType } from "@/hooks/use-issue-layout-store";
import { useIssueRealtime } from "@/hooks/use-issue-realtime";
import { useWorkItemProperties } from "@/plane-web/hooks/use-issue-properties";
// local imports
import type { TIssueOperations } from "../issue-detail";
import { IssueView } from "./view";

const isTextEditor = (element: Element | null) =>
  element instanceof HTMLTextAreaElement ||
  (element instanceof HTMLInputElement && !["checkbox", "radio", "button", "submit"].includes(element.type)) ||
  element?.closest('[contenteditable="true"]') !== null;

export const IssuePeekOverview = observer(function IssuePeekOverview(props: IWorkItemPeekOverview) {
  const {
    embedIssue = false,
    embedRemoveCurrentNotification,
    is_draft = false,
    storeType: issueStoreFromProps,
  } = props;
  const { t } = useTranslation();
  // router
  const pathname = usePathname();
  // store hook
  const { allowPermissions } = useUserPermissions();

  const {
    issues: { restoreIssue },
  } = useIssues(EIssuesStoreType.ARCHIVED);
  const {
    peekIssue,
    setPeekIssue,
    issue: { fetchIssue },
    fetchActivities,
  } = useIssueDetail();
  const issueStoreType = useIssueStoreType();
  const storeType = issueStoreFromProps ?? issueStoreType;
  const { issues } = useIssues(storeType);

  useWorkItemProperties(
    peekIssue?.projectId,
    peekIssue?.workspaceSlug,
    peekIssue?.issueId,
    storeType === EIssuesStoreType.EPIC ? EIssueServiceType.EPICS : EIssueServiceType.ISSUES
  );
  // state
  const [hasError, setHasError] = useState(false);
  const [isTextEditorFocused, setIsTextEditorFocused] = useState(false);
  const peekRootId = peekIssue?.issueId ? `issue-peek-overview-${peekIssue.issueId}` : undefined;
  const isTextEditorActive = useCallback(() => {
    const root = peekRootId ? document.getElementById(peekRootId) : null;
    return Boolean(root?.contains(document.activeElement) && isTextEditor(document.activeElement));
  }, [peekRootId]);

  useEffect(() => {
    if (!peekRootId) {
      setIsTextEditorFocused(false);
      return;
    }

    const root = document.getElementById(peekRootId);
    if (!root) return;

    const syncTextEditorFocus = () => setIsTextEditorFocused(isTextEditorActive());
    let focusTimeout: number | undefined;
    const handleFocusOut = () => {
      window.clearTimeout(focusTimeout);
      focusTimeout = window.setTimeout(syncTextEditorFocus, 0);
    };

    syncTextEditorFocus();
    root.addEventListener("focusin", syncTextEditorFocus);
    root.addEventListener("focusout", handleFocusOut);

    return () => {
      root.removeEventListener("focusin", syncTextEditorFocus);
      root.removeEventListener("focusout", handleFocusOut);
      window.clearTimeout(focusTimeout);
    };
  }, [isTextEditorActive, peekRootId]);

  const shouldResyncRealtime = useCallback(() => !isTextEditorActive(), [isTextEditorActive]);
  const realtimePeekIssue = storeType === EIssuesStoreType.EPIC ? undefined : peekIssue;
  const { isConnected: isRealtimeConnected } = useIssueRealtime({
    workspaceSlug: realtimePeekIssue?.workspaceSlug ?? "",
    projectId: realtimePeekIssue?.projectId ?? "",
    issueId: realtimePeekIssue?.issueId ?? "",
    shouldResync: shouldResyncRealtime,
  });

  const removeRoutePeekId = useCallback(() => {
    setPeekIssue(undefined);
    if (embedIssue) embedRemoveCurrentNotification?.();
  }, [embedIssue, embedRemoveCurrentNotification, setPeekIssue]);

  const issueOperations: TIssueOperations = useMemo(
    () => ({
      fetch: async (workspaceSlug: string, projectId: string, issueId: string) => {
        try {
          setHasError(false);
          await fetchIssue(workspaceSlug, projectId, issueId);
        } catch (error) {
          setHasError(true);
          console.error("Error fetching the parent issue", error);
        }
      },
      update: async (workspaceSlug: string, projectId: string, issueId: string, data: Partial<TIssue>) => {
        if (issues?.updateIssue) {
          await issues
            .updateIssue(workspaceSlug, projectId, issueId, data)
            .then(async () => {
              fetchActivities(workspaceSlug, projectId, issueId);
              return;
            })
            .catch((_error) => {
              setToast({
                title: t("toast.error"),
                type: TOAST_TYPE.ERROR,
                message: t("entity.update.failed", { entity: t("issue.label", { count: 1 }) }),
              });
            });
        }
      },
      remove: async (workspaceSlug: string, projectId: string, issueId: string) => {
        try {
          return issues?.removeIssue(workspaceSlug, projectId, issueId).then(() => {
            removeRoutePeekId();
            return;
          });
        } catch (_error) {
          setToast({
            title: t("toast.error"),
            type: TOAST_TYPE.ERROR,
            message: t("entity.delete.failed", { entity: t("issue.label", { count: 1 }) }),
          });
        }
      },
      archive: async (workspaceSlug: string, projectId: string, issueId: string) => {
        try {
          if (!issues?.archiveIssue) return;
          await issues.archiveIssue(workspaceSlug, projectId, issueId);
        } catch (error) {
          console.error("Error archiving the issue", error);
        }
      },
      restore: async (workspaceSlug: string, projectId: string, issueId: string) => {
        try {
          await restoreIssue(workspaceSlug, projectId, issueId);
          setToast({
            type: TOAST_TYPE.SUCCESS,
            title: t("issue.restore.success.title"),
            message: t("issue.restore.success.message"),
          });
        } catch (_error) {
          setToast({
            type: TOAST_TYPE.ERROR,
            title: t("toast.error"),
            message: t("issue.restore.failed.message"),
          });
        }
      },
      addCycleToIssue: async (workspaceSlug: string, projectId: string, cycleId: string, issueId: string) => {
        try {
          await issues.addCycleToIssue(workspaceSlug, projectId, cycleId, issueId);
          fetchActivities(workspaceSlug, projectId, issueId);
        } catch (_error) {
          setToast({
            type: TOAST_TYPE.ERROR,
            title: t("toast.error"),
            message: t("issue.add.cycle.failed"),
          });
        }
      },
      addIssueToCycle: async (workspaceSlug: string, projectId: string, cycleId: string, issueIds: string[]) => {
        try {
          await issues.addIssueToCycle(workspaceSlug, projectId, cycleId, issueIds);
        } catch (_error) {
          setToast({
            type: TOAST_TYPE.ERROR,
            title: t("toast.error"),
            message: t("issue.add.cycle.failed"),
          });
        }
      },
      removeIssueFromCycle: async (workspaceSlug: string, projectId: string, cycleId: string, issueId: string) => {
        try {
          const removeFromCyclePromise = issues.removeIssueFromCycle(workspaceSlug, projectId, cycleId, issueId);
          setPromiseToast(removeFromCyclePromise, {
            loading: t("issue.remove.cycle.loading"),
            success: {
              title: t("toast.success"),
              message: () => t("issue.remove.cycle.success"),
            },
            error: {
              title: t("toast.error"),
              message: () => t("issue.remove.cycle.failed"),
            },
          });
          await removeFromCyclePromise;
          fetchActivities(workspaceSlug, projectId, issueId);
        } catch (error) {
          console.error("Error removing issue from cycle", error);
        }
      },
      changeModulesInIssue: async (
        workspaceSlug: string,
        projectId: string,
        issueId: string,
        addModuleIds: string[],
        removeModuleIds: string[]
      ) => {
        const promise = await issues.changeModulesInIssue(
          workspaceSlug,
          projectId,
          issueId,
          addModuleIds,
          removeModuleIds
        );
        fetchActivities(workspaceSlug, projectId, issueId);
        return promise;
      },
      removeIssueFromModule: async (workspaceSlug: string, projectId: string, moduleId: string, issueId: string) => {
        try {
          const removeFromModulePromise = issues.removeIssuesFromModule(workspaceSlug, projectId, moduleId, [issueId]);
          setPromiseToast(removeFromModulePromise, {
            loading: t("issue.remove.module.loading"),
            success: {
              title: t("toast.success"),
              message: () => t("issue.remove.module.success"),
            },
            error: {
              title: t("toast.error"),
              message: () => t("issue.remove.module.failed"),
            },
          });
          await removeFromModulePromise;
          fetchActivities(workspaceSlug, projectId, issueId);
        } catch (error) {
          console.error("Error removing issue from module", error);
        }
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fetchIssue, is_draft, issues, fetchActivities, pathname, removeRoutePeekId, restoreIssue]
  );

  const { isLoading } = useSWR(
    peekIssue ? ["peek-issue", peekIssue.workspaceSlug, peekIssue.projectId, peekIssue.issueId] : null,
    () => {
      if (!peekIssue || isTextEditorActive()) return;
      return issueOperations.fetch(peekIssue.workspaceSlug, peekIssue.projectId, peekIssue.issueId);
    },
    {
      // Realtime is authoritative while connected. Poll only when the stream is
      // unavailable, and never while an editor in the peek view has focus.
      refreshInterval: isRealtimeConnected || isTextEditorFocused ? 0 : 60000,
      refreshWhenHidden: false,
      refreshWhenOffline: false,
      revalidateIfStale: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  if (!peekIssue?.workspaceSlug || !peekIssue?.projectId || !peekIssue?.issueId) return <></>;

  // Check if issue is editable, based on user role
  const isEditable = allowPermissions(
    [EUserPermissions.ADMIN, EUserPermissions.MEMBER],
    EUserPermissionsLevel.PROJECT,
    peekIssue?.workspaceSlug,
    peekIssue?.projectId
  );

  return (
    <IssueView
      workspaceSlug={peekIssue.workspaceSlug}
      projectId={peekIssue.projectId}
      issueId={peekIssue.issueId}
      isLoading={isLoading}
      isError={hasError}
      is_archived={!!peekIssue.isArchived}
      disabled={!isEditable}
      embedIssue={embedIssue}
      embedRemoveCurrentNotification={embedRemoveCurrentNotification}
      issueOperations={issueOperations}
      rootId={peekRootId}
    />
  );
});
