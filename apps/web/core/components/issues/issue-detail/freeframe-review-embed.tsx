/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "@plane/i18n";
import { FreeFrameReviewAssetPicker } from "./freeframe-review-asset-picker";

const FREEFRAME_READY_MESSAGE = "freeframe:plane-review:ready";
const FREEFRAME_RESIZE_MESSAGE = "freeframe:plane-review:resize";
const FREEFRAME_INIT_MESSAGE = "freeframe:plane-review:init";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type TFreeFrameSession = {
  asset_id: string;
  integration_token: string;
  can_manage: boolean;
};

type TFreeFrameError = {
  can_manage?: boolean;
};

type TLoadState = "loading" | "hidden" | "unlinked" | "linked";

type Props = {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
};

export function FreeFrameReviewEmbed(props: Props) {
  const { workspaceSlug, projectId, issueId } = props;
  const { t } = useTranslation();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [session, setSession] = useState<TFreeFrameSession | null>(null);
  const [loadState, setLoadState] = useState<TLoadState>("loading");
  const [canManage, setCanManage] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [hasMutationError, setHasMutationError] = useState(false);
  const [height, setHeight] = useState(560);

  const embedUrl = import.meta.env.VITE_FREEFRAME_REVIEW_EMBED_URL as string | undefined;
  const embedOrigin = useMemo(() => {
    if (!embedUrl) return null;
    try {
      return new URL(embedUrl).origin;
    } catch {
      return null;
    }
  }, [embedUrl]);
  const issueApiPrefix = useMemo(
    () =>
      `/api/workspaces/${encodeURIComponent(workspaceSlug)}/projects/${encodeURIComponent(projectId)}/issues/${encodeURIComponent(issueId)}`,
    [issueId, projectId, workspaceSlug]
  );
  const sessionUrl = `${issueApiPrefix}/freeframe-review-session/`;
  const catalogUrl = `${issueApiPrefix}/freeframe-review-assets/`;

  const loadSession = useCallback(
    async (signal?: AbortSignal) => {
      setSession(null);
      setLoadState("loading");

      if (!embedOrigin) {
        setLoadState("hidden");
        return;
      }

      const response = await fetch(sessionUrl, {
        credentials: "include",
        headers: { Accept: "application/json" },
        signal,
      });
      const payload = (await response.json().catch(() => ({}))) as TFreeFrameSession & TFreeFrameError;

      if (response.status === 404) {
        const manageable = payload.can_manage === true;
        setCanManage(manageable);
        setLoadState(manageable ? "unlinked" : "hidden");
        return;
      }
      if (!response.ok) throw new Error(String(response.status));

      setCanManage(payload.can_manage === true);
      setSession(payload);
      setLoadState("linked");
    },
    [embedOrigin, sessionUrl]
  );

  useEffect(() => {
    setHasMutationError(false);
    const controller = new AbortController();

    loadSession(controller.signal).catch((error) => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setLoadState("hidden");
    });

    return () => controller.abort();
  }, [loadSession]);

  useEffect(() => {
    if (!embedOrigin || !session) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== embedOrigin || event.source !== iframeRef.current?.contentWindow) return;
      if (!event.data || typeof event.data !== "object") return;

      if (event.data.type === FREEFRAME_READY_MESSAGE) {
        iframeRef.current?.contentWindow?.postMessage(
          {
            type: FREEFRAME_INIT_MESSAGE,
            assetId: session.asset_id,
            integrationToken: session.integration_token,
          },
          embedOrigin
        );
      }

      if (
        event.data.type === FREEFRAME_RESIZE_MESSAGE &&
        typeof event.data.height === "number" &&
        Number.isFinite(event.data.height)
      ) {
        setHeight(Math.min(Math.max(Math.round(event.data.height), 320), 1600));
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [embedOrigin, session]);

  const connectAsset = async (assetId: string): Promise<boolean> => {
    if (!UUID_PATTERN.test(assetId)) {
      setHasMutationError(true);
      return false;
    }

    setIsMutating(true);
    setHasMutationError(false);
    try {
      const response = await fetch(sessionUrl, {
        method: "PUT",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ asset_id: assetId }),
      });
      if (!response.ok) throw new Error(String(response.status));
      await loadSession();
      return true;
    } catch {
      setHasMutationError(true);
      return false;
    } finally {
      setIsMutating(false);
    }
  };

  const handleDisconnect = async () => {
    setIsMutating(true);
    setHasMutationError(false);
    try {
      const response = await fetch(sessionUrl, {
        method: "DELETE",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error(String(response.status));
      setSession(null);
      setCanManage(true);
      setLoadState("unlinked");
    } catch {
      setHasMutationError(true);
    } finally {
      setIsMutating(false);
    }
  };

  if (!embedUrl || !embedOrigin || loadState === "loading" || loadState === "hidden") return null;

  if (loadState === "unlinked" && canManage) {
    return (
      <section className="rounded-lg border border-subtle bg-surface-1 p-3">
        <FreeFrameReviewAssetPicker catalogUrl={catalogUrl} disabled={isMutating} onSelect={connectAsset} />
        {hasMutationError && <p className="text-red-500 mt-2 text-12">{t("something_went_wrong_please_try_again")}</p>}
      </section>
    );
  }

  if (!session) return null;

  return (
    <section className="overflow-hidden rounded-lg border border-subtle bg-surface-1">
      {canManage && (
        <div className="flex items-center justify-between gap-3 border-b border-subtle px-3 py-2">
          <code className="min-w-0 truncate text-11 text-tertiary">{session.asset_id}</code>
          <button
            type="button"
            disabled={isMutating}
            onClick={handleDisconnect}
            className="shrink-0 rounded-md border border-subtle px-2.5 py-1.5 text-12 text-secondary hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isMutating ? t("loading") : t("remove")}
          </button>
        </div>
      )}
      {hasMutationError && (
        <p className="text-red-500 border-b border-subtle px-3 py-2 text-12">
          {t("something_went_wrong_please_try_again")}
        </p>
      )}
      <iframe
        ref={iframeRef}
        src={embedUrl}
        title={embedOrigin}
        className="block w-full border-0"
        style={{ height }}
        sandbox="allow-scripts allow-forms allow-popups"
        allow="fullscreen"
      />
    </section>
  );
}
