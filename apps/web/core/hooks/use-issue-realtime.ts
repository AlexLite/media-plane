/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect, useRef, useState } from "react";
// plane imports
import type { TIssue, TIssueComment } from "@plane/types";
// hooks
import { useIssueDetail } from "@/hooks/store/use-issue-detail";

type TIssueRealtimeEnvelope<TData = unknown> = {
  v: number;
  event_id: string;
  type: "issue.updated" | "comment.created" | "comment.updated" | "comment.deleted";
  issue_id: string;
  project_id: string;
  workspace_id: string;
  actor_id: string | null;
  occurred_at: string;
  data: TData;
};

type TUseIssueRealtime = {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  shouldResync?: () => boolean;
};

const parseEnvelope = <TData>(message: MessageEvent<string>): TIssueRealtimeEnvelope<TData> | undefined => {
  try {
    return JSON.parse(message.data) as TIssueRealtimeEnvelope<TData>;
  } catch (error) {
    console.error("Unable to parse work-item realtime event", error);
    return undefined;
  }
};

export const useIssueRealtime = ({ workspaceSlug, projectId, issueId, shouldResync }: TUseIssueRealtime) => {
  const [isConnected, setIsConnected] = useState(false);
  const hasConnected = useRef(false);
  const issueDetail = useIssueDetail();

  useEffect(() => {
    if (!workspaceSlug || !projectId || !issueId) return;

    const streamUrl = `/api/workspaces/${encodeURIComponent(workspaceSlug)}/projects/${encodeURIComponent(
      projectId
    )}/issues/${encodeURIComponent(issueId)}/events/`;
    const eventSource = new EventSource(streamUrl, { withCredentials: true });

    const handleIssueUpdate = (message: Event) => {
      const event = parseEnvelope<Partial<TIssue>>(message as MessageEvent<string>);
      if (!event || event.issue_id !== issueId) return;
      issueDetail.rootIssueStore.issues.updateIssue(issueId, event.data);
    };

    const handleCommentUpsert = (message: Event) => {
      const event = parseEnvelope<TIssueComment>(message as MessageEvent<string>);
      if (!event || event.issue_id !== issueId || !event.data?.id) return;
      issueDetail.comment.upsertComment(issueId, event.data);
    };

    const handleCommentDelete = (message: Event) => {
      const event = parseEnvelope<{ id: string }>(message as MessageEvent<string>);
      if (!event || event.issue_id !== issueId || !event.data?.id) return;
      issueDetail.comment.removeCommentLocally(issueId, event.data.id);
    };

    eventSource.addEventListener("issue.updated", handleIssueUpdate);
    eventSource.addEventListener("comment.created", handleCommentUpsert);
    eventSource.addEventListener("comment.updated", handleCommentUpsert);
    eventSource.addEventListener("comment.deleted", handleCommentDelete);

    eventSource.onopen = () => {
      setIsConnected(true);

      if (hasConnected.current && (shouldResync?.() ?? true)) {
        void issueDetail.fetchIssue(workspaceSlug, projectId, issueId);
      }
      hasConnected.current = true;
    };

    eventSource.onerror = () => {
      // Native EventSource retries automatically using the server-provided delay.
      setIsConnected(false);
    };

    return () => {
      eventSource.removeEventListener("issue.updated", handleIssueUpdate);
      eventSource.removeEventListener("comment.created", handleCommentUpsert);
      eventSource.removeEventListener("comment.updated", handleCommentUpsert);
      eventSource.removeEventListener("comment.deleted", handleCommentDelete);
      eventSource.close();
      setIsConnected(false);
      hasConnected.current = false;
    };
  }, [workspaceSlug, projectId, issueId, issueDetail, shouldResync]);

  return { isConnected };
};
