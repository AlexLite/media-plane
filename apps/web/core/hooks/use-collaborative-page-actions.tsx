/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import type { TDocumentEventsServer } from "@plane/editor";
import type { TDocumentEventsClient } from "@plane/editor/lib";
import { DocumentCollaborativeEvents, getServerEventName } from "@plane/editor/lib";
import { useTranslation } from "@plane/i18n";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
// store
import type { TPageInstance } from "@/store/pages/base-page";

export type CollaborativeAction = {
  execute: (shouldSync?: boolean, recursive?: boolean) => Promise<void>;
  errorMessageKey: string;
};

type CollaborativeActionEvent =
  | { type: "sendMessageToServer"; message: TDocumentEventsServer; recursive?: boolean }
  | { type: "receivedMessageFromServer"; message: TDocumentEventsClient };

type Props = {
  page: TPageInstance;
};

export const useCollaborativePageActions = (props: Props) => {
  const { page } = props;
  const { t } = useTranslation();
  const editorRef = page.editor.editorRef;
  // currentUserAction local state to track if the current action is being processed, a
  // local action is basically the action performed by the current user to avoid double operations
  const [currentActionBeingProcessed, setCurrentActionBeingProcessed] = useState<TDocumentEventsClient | null>(null);

  // @ts-expect-error - TODO: fix this
  const actionHandlerMap: Record<TDocumentEventsClient, CollaborativeAction> = useMemo(
    () => ({
      [DocumentCollaborativeEvents.lock.client]: {
        execute: (shouldSync?: boolean, recursive?: boolean) => page.lock({ shouldSync, recursive }),
        errorMessageKey: "page_operations.lock_failed",
      },
      [DocumentCollaborativeEvents.unlock.client]: {
        execute: (shouldSync?: boolean, recursive?: boolean) => page.unlock({ shouldSync, recursive }),
        errorMessageKey: "page_operations.unlock_failed",
      },
      [DocumentCollaborativeEvents.archive.client]: {
        execute: (shouldSync?: boolean) => page.archive({ shouldSync }),
        errorMessageKey: "page_operations.archive_failed",
      },
      [DocumentCollaborativeEvents.unarchive.client]: {
        execute: (shouldSync?: boolean) => page.restore({ shouldSync }),
        errorMessageKey: "page_operations.restore_failed",
      },
      [DocumentCollaborativeEvents["make-public"].client]: {
        execute: (shouldSync?: boolean) => page.makePublic({ shouldSync }),
        errorMessageKey: "page_operations.make_public_failed",
      },
      [DocumentCollaborativeEvents["make-private"].client]: {
        execute: (shouldSync?: boolean) => page.makePrivate({ shouldSync }),
        errorMessageKey: "page_operations.make_private_failed",
      },
    }),
    [page]
  );

  const executeCollaborativeAction = useCallback(
    async (event: CollaborativeActionEvent) => {
      const isPerformedByCurrentUser = event.type === "sendMessageToServer";
      const clientAction = isPerformedByCurrentUser ? DocumentCollaborativeEvents[event.message].client : event.message;
      const actionDetails = actionHandlerMap[clientAction];
      try {
        await actionDetails.execute(isPerformedByCurrentUser, isPerformedByCurrentUser ? event?.recursive : undefined);
        if (isPerformedByCurrentUser) {
          const serverEventName = getServerEventName(clientAction);
          if (serverEventName) {
            editorRef?.emitRealTimeUpdate(serverEventName);
          }
        }
      } catch {
        if (actionDetails?.errorMessageKey) {
          setToast({
            type: TOAST_TYPE.ERROR,
            title: t("common.error.label"),
            message: t(actionDetails.errorMessageKey),
          });
        }
      }
    },
    [actionHandlerMap, editorRef, t]
  );

  useEffect(() => {
    const realTimeStatelessMessageListener = editorRef?.listenToRealTimeUpdate();
    const handleStatelessMessage = (message: { payload: TDocumentEventsClient }) => {
      if (currentActionBeingProcessed === message.payload) {
        setCurrentActionBeingProcessed(null);
        return;
      }

      if (message.payload) {
        executeCollaborativeAction({ type: "receivedMessageFromServer", message: message.payload });
      }
    };

    realTimeStatelessMessageListener?.on("stateless", handleStatelessMessage);

    return () => {
      realTimeStatelessMessageListener?.off("stateless", handleStatelessMessage);
    };
  }, [editorRef, currentActionBeingProcessed, executeCollaborativeAction]);

  return {
    executeCollaborativeAction,
  };
};
