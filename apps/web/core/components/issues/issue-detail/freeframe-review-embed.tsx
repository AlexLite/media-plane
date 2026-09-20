/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Maximize2, Video, X } from "lucide-react";
import { useTranslation } from "@plane/i18n";
import { EModalPosition, EModalWidth, ModalCore } from "@plane/ui";
import { FreeFrameReviewAssetPicker } from "./freeframe-review-asset-picker";

const FREEFRAME_READY_MESSAGE = "freeframe:plane-review:ready";
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
  const { t, currentLocale } = useTranslation();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [session, setSession] = useState<TFreeFrameSession | null>(null);
  const [loadState, setLoadState] = useState<TLoadState>("loading");
  const [canManage, setCanManage] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [hasMutationError, setHasMutationError] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

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
        setLoadState("unlinked");
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

  const postSessionToIframe = useCallback(() => {
    if (!embedOrigin || !session) return;

    iframeRef.current?.contentWindow?.postMessage(
      {
        type: FREEFRAME_INIT_MESSAGE,
        assetId: session.asset_id,
        integrationToken: session.integration_token,
        locale: currentLocale,
      },
      embedOrigin
    );
  }, [currentLocale, embedOrigin, session]);

  useEffect(() => {
    if (!embedOrigin || !session) return;

    const initRetryId = window.setInterval(postSessionToIframe, 500);
    postSessionToIframe();

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== embedOrigin || event.source !== iframeRef.current?.contentWindow) return;
      if (!event.data || typeof event.data !== "object") return;

      if (event.data.type === FREEFRAME_READY_MESSAGE) {
        postSessionToIframe();
        window.clearInterval(initRetryId);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.clearInterval(initRetryId);
      window.removeEventListener("message", handleMessage);
    };
  }, [embedOrigin, postSessionToIframe, session]);

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
      setIsPickerOpen(false);
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
      setIsReviewOpen(false);
    } catch {
      setHasMutationError(true);
    } finally {
      setIsMutating(false);
    }
  };

  const handleOpenReview = async () => {
    setIsMutating(true);
    setHasMutationError(false);
    try {
      const response = await fetch(sessionUrl, {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      const payload = (await response.json().catch(() => ({}))) as TFreeFrameSession & TFreeFrameError;
      if (!response.ok) throw new Error(String(response.status));

      setCanManage(payload.can_manage === true);
      setSession(payload);
      setIsReviewOpen(true);
    } catch {
      setHasMutationError(true);
    } finally {
      setIsMutating(false);
    }
  };

  if (!embedUrl || !embedOrigin || loadState === "loading" || loadState === "hidden") return null;

  if (loadState === "unlinked") {
    return (
      <section className="rounded-lg border border-subtle bg-surface-1 p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-md bg-surface-2 text-secondary">
              <Video size={18} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h3 className="text-13 font-medium text-primary">{t("freeframe_review.title")}</h3>
              <p className="text-11 text-tertiary">{t("freeframe_review.no_asset_description")}</p>
            </div>
          </div>
          {canManage ? (
            <button
              type="button"
              disabled={isMutating}
              onClick={() => setIsPickerOpen((current) => !current)}
              className="bg-accent rounded-md px-3 py-2 text-12 font-medium text-on-color disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("freeframe_review.attach_or_create")}
            </button>
          ) : (
            <button
              type="button"
              disabled
              title={t("freeframe_review.no_asset_permission_hint")}
              className="rounded-md border border-subtle px-3 py-2 text-12 text-tertiary opacity-60"
            >
              {t("freeframe_review.no_asset")}
            </button>
          )}
        </div>
        {isPickerOpen && canManage && (
          <div className="mt-3 border-t border-subtle pt-3">
            <FreeFrameReviewAssetPicker catalogUrl={catalogUrl} disabled={isMutating} onSelect={connectAsset} />
          </div>
        )}
        {hasMutationError && <p className="text-red-500 mt-2 text-12">{t("something_went_wrong_please_try_again")}</p>}
      </section>
    );
  }

  if (!session) return null;

  return (
    <>
      <section className="rounded-lg border border-subtle bg-surface-1 p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-md bg-surface-2 text-secondary">
              <Video size={18} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h3 className="text-13 font-medium text-primary">{t("freeframe_review.title")}</h3>
              <code className="block truncate text-11 text-tertiary">{session.asset_id}</code>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canManage && (
              <button
                type="button"
                disabled={isMutating}
                onClick={handleDisconnect}
                className="rounded-md border border-subtle px-2.5 py-2 text-12 text-secondary hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isMutating ? t("loading") : t("freeframe_review.unlink")}
              </button>
            )}
            <button
              type="button"
              disabled={isMutating}
              onClick={() => void handleOpenReview()}
              className="bg-accent inline-flex items-center gap-2 rounded-md px-3 py-2 text-12 font-medium text-on-color disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Maximize2 size={14} aria-hidden="true" />
              {t("freeframe_review.open_review")}
            </button>
          </div>
        </div>
        {hasMutationError && <p className="text-red-500 mt-2 text-12">{t("something_went_wrong_please_try_again")}</p>}
      </section>

      <ModalCore
        isOpen={isReviewOpen}
        handleClose={() => setIsReviewOpen(false)}
        position={EModalPosition.CENTER}
        width={EModalWidth.VIIXL}
        className="flex h-[calc(100vh-2rem)] max-h-[900px] !max-w-[1440px] flex-col overflow-hidden sm:w-[calc(100vw-3rem)]"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-subtle px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-14 font-medium text-primary">{t("freeframe_review.overlay_title")}</h2>
            <code className="block truncate text-11 text-tertiary">{session.asset_id}</code>
          </div>
          <button
            type="button"
            onClick={() => setIsReviewOpen(false)}
            aria-label={t("freeframe_review.close_review")}
            className="grid size-8 shrink-0 place-items-center rounded-md text-secondary hover:bg-surface-2 hover:text-primary"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <iframe
          ref={iframeRef}
          src={embedUrl}
          title={t("freeframe_review.iframe_title")}
          onLoad={postSessionToIframe}
          className="block min-h-0 flex-1 border-0"
          // The configured embed URL is validated as cross-origin; preserving its origin is required for exact postMessage checks.
          // eslint-disable-next-line react/iframe-missing-sandbox
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          allow="fullscreen"
        />
      </ModalCore>
    </>
  );
}
