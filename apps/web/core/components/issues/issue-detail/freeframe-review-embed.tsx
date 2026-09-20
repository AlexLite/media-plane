/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect, useMemo, useRef, useState } from "react";

const FREEFRAME_READY_MESSAGE = "freeframe:plane-review:ready";
const FREEFRAME_RESIZE_MESSAGE = "freeframe:plane-review:resize";
const FREEFRAME_INIT_MESSAGE = "freeframe:plane-review:init";

type TFreeFrameSession = {
  asset_id: string;
  integration_token: string;
};

type Props = {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
};

export function FreeFrameReviewEmbed(props: Props) {
  const { workspaceSlug, projectId, issueId } = props;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [session, setSession] = useState<TFreeFrameSession | null>(null);
  const [height, setHeight] = useState(560);
  const [isUnavailable, setIsUnavailable] = useState(false);

  const embedUrl = import.meta.env.VITE_FREEFRAME_REVIEW_EMBED_URL as string | undefined;
  const embedOrigin = useMemo(() => {
    if (!embedUrl) return null;
    try {
      return new URL(embedUrl).origin;
    } catch {
      return null;
    }
  }, [embedUrl]);

  useEffect(() => {
    setSession(null);
    setIsUnavailable(false);

    if (!embedOrigin) {
      setIsUnavailable(true);
      return;
    }

    const controller = new AbortController();
    const sessionUrl = `/api/workspaces/${encodeURIComponent(workspaceSlug)}/projects/${encodeURIComponent(projectId)}/issues/${encodeURIComponent(issueId)}/freeframe-review-session/`;

    fetch(sessionUrl, {
      credentials: "include",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (response.status === 204 || response.status === 404) {
          setIsUnavailable(true);
          return null;
        }
        if (!response.ok) throw new Error("Unable to initialize FreeFrame review");
        return (await response.json()) as TFreeFrameSession;
      })
      .then((value) => {
        if (value) setSession(value);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setIsUnavailable(true);
      });

    return () => controller.abort();
  }, [embedOrigin, issueId, projectId, workspaceSlug]);

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

  if (isUnavailable || !embedUrl || !embedOrigin || !session) return null;

  return (
    <section className="overflow-hidden rounded-lg border border-subtle bg-surface-1">
      <iframe
        ref={iframeRef}
        src={embedUrl}
        title="FreeFrame media review"
        className="block w-full border-0"
        style={{ height }}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        allow="fullscreen"
      />
    </section>
  );
}
