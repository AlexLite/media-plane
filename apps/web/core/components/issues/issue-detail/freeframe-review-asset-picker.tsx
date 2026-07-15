/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "@plane/i18n";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ASSET_TYPES = ["video", "image", "audio", "image_carousel"] as const;

type TCatalogAsset = {
  id: string;
  name: string;
  asset_type: string;
  thumbnail_url?: string | null;
  latest_version?: {
    processing_status?: string;
  } | null;
};

type Props = {
  catalogUrl: string;
  disabled: boolean;
  onSelect: (assetId: string) => Promise<boolean>;
};

function isCatalogAsset(value: unknown): value is TCatalogAsset {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<TCatalogAsset>;
  return (
    typeof candidate.id === "string" &&
    UUID_PATTERN.test(candidate.id) &&
    typeof candidate.name === "string" &&
    candidate.name.trim().length > 0 &&
    typeof candidate.asset_type === "string"
  );
}

export function FreeFrameReviewAssetPicker(props: Props) {
  const { catalogUrl, disabled, onSelect } = props;
  const { t } = useTranslation();
  const [assets, setAssets] = useState<TCatalogAsset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [newAssetName, setNewAssetName] = useState("");
  const [newAssetType, setNewAssetType] = useState<(typeof ASSET_TYPES)[number]>("video");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [hasError, setHasError] = useState(false);

  const loadAssets = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      setHasError(false);
      try {
        const search = new URLSearchParams({ limit: "50" });
        if (submittedQuery) search.set("q", submittedQuery);

        const response = await fetch(`${catalogUrl}?${search.toString()}`, {
          credentials: "include",
          headers: { Accept: "application/json" },
          signal,
        });
        const payload = (await response.json().catch(() => [])) as unknown;
        if (!response.ok || !Array.isArray(payload)) throw new Error(String(response.status));

        const nextAssets = payload.filter(isCatalogAsset);
        setAssets(nextAssets);
        setSelectedAssetId((current) =>
          nextAssets.some((asset) => asset.id === current) ? current : (nextAssets[0]?.id ?? "")
        );
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setAssets([]);
        setSelectedAssetId("");
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    },
    [catalogUrl, submittedQuery]
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadAssets(controller.signal);
    return () => controller.abort();
  }, [loadAssets]);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedQuery = query.trim();
    if (normalizedQuery === submittedQuery) {
      void loadAssets();
      return;
    }
    setSubmittedQuery(normalizedQuery);
  };

  const handleSelect = async () => {
    if (!UUID_PATTERN.test(selectedAssetId)) return;
    await onSelect(selectedAssetId);
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = newAssetName.trim();
    if (!name) return;

    setIsCreating(true);
    setHasError(false);
    try {
      const response = await fetch(catalogUrl, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          asset_type: newAssetType,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as Partial<TCatalogAsset>;
      if (!response.ok || !isCatalogAsset(payload)) throw new Error(String(response.status));

      setNewAssetName("");
      const linked = await onSelect(payload.id);
      if (!linked) await loadAssets();
    } catch {
      setHasError(true);
    } finally {
      setIsCreating(false);
    }
  };

  const busy = disabled || isLoading || isCreating;

  return (
    <div className="space-y-3">
      <form className="flex flex-wrap items-center gap-2" onSubmit={handleSearch}>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("search")}
          aria-label={t("search")}
          autoComplete="off"
          disabled={busy}
          maxLength={100}
          className="focus:border-accent min-w-52 flex-1 rounded-md border border-subtle bg-surface-1 px-3 py-2 text-13 text-primary outline-none"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-md border border-subtle px-3 py-2 text-13 text-secondary hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? t("loading") : t("search")}
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={selectedAssetId}
          onChange={(event) => setSelectedAssetId(event.target.value)}
          aria-label={t("select")}
          disabled={busy || assets.length === 0}
          className="focus:border-accent min-w-64 flex-1 rounded-md border border-subtle bg-surface-1 px-3 py-2 text-13 text-primary outline-none disabled:opacity-50"
        >
          {assets.map((asset) => (
            <option key={asset.id} value={asset.id}>
              {asset.name} · {asset.asset_type}
              {asset.latest_version?.processing_status
                ? ` · ${asset.latest_version.processing_status}`
                : ""}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={busy || !selectedAssetId}
          onClick={() => void handleSelect()}
          className="bg-accent rounded-md px-3 py-2 text-13 font-medium text-on-color disabled:cursor-not-allowed disabled:opacity-50"
        >
          {disabled ? t("adding") : t("add")}
        </button>
      </div>

      <form className="flex flex-wrap items-center gap-2 border-t border-subtle pt-3" onSubmit={handleCreate}>
        <input
          type="text"
          value={newAssetName}
          onChange={(event) => setNewAssetName(event.target.value)}
          placeholder={t("name")}
          aria-label={t("name")}
          autoComplete="off"
          disabled={busy}
          maxLength={255}
          className="focus:border-accent min-w-52 flex-1 rounded-md border border-subtle bg-surface-1 px-3 py-2 text-13 text-primary outline-none"
        />
        <select
          value={newAssetType}
          onChange={(event) =>
            setNewAssetType(event.target.value as (typeof ASSET_TYPES)[number])
          }
          aria-label={t("type")}
          disabled={busy}
          className="focus:border-accent rounded-md border border-subtle bg-surface-1 px-3 py-2 text-13 text-primary outline-none"
        >
          {ASSET_TYPES.map((assetType) => (
            <option key={assetType} value={assetType}>
              {assetType}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={busy || !newAssetName.trim()}
          className="rounded-md border border-subtle px-3 py-2 text-13 text-secondary hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isCreating ? t("adding") : t("create")}
        </button>
      </form>

      {hasError && (
        <p className="text-red-500 text-12">{t("something_went_wrong_please_try_again")}</p>
      )}
    </div>
  );
}
