/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect, useMemo, useState } from "react";
import { observer } from "mobx-react";
import useSWR from "swr";
import { Workflow } from "lucide-react";
// plane imports
import { EIconSize, EUserPermissionsLevel } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { StateGroupIcon } from "@plane/propel/icons";
import type { IState } from "@plane/types";
import { EUserProjectRoles } from "@plane/types";
import { sortStates } from "@plane/utils";
// hooks
import { useProjectState } from "@/hooks/store/use-project-state";
import { useUserPermissions } from "@/hooks/store/user";

type Props = {
  workspaceSlug: string;
  projectId: string;
};

const normalizeAliases = (value: string) => {
  const seen = new Set<string>();
  return value
    .split(",")
    .map((alias) => alias.trim())
    .filter((alias) => {
      if (!alias) return false;
      const key = alias.toLocaleLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const aliasesToText = (aliases: string[] | undefined) => aliases?.join(", ") ?? "";

export const ProjectPipelineAliasesRoot = observer(function ProjectPipelineAliasesRoot(props: Props) {
  const { workspaceSlug, projectId } = props;
  const { fetchProjectStates, getProjectStates, updateState } = useProjectState();
  const { allowPermissions } = useUserPermissions();
  const { t } = useTranslation();
  const [draftAliases, setDraftAliases] = useState<Record<string, string>>({});
  const [savingStateId, setSavingStateId] = useState<string | null>(null);

  const isEditable = allowPermissions(
    [EUserProjectRoles.ADMIN],
    EUserPermissionsLevel.PROJECT,
    workspaceSlug,
    projectId
  );

  useSWR(
    workspaceSlug && projectId ? `PROJECT_PIPELINE_ALIASES_${workspaceSlug}_${projectId}` : null,
    workspaceSlug && projectId ? () => fetchProjectStates(workspaceSlug, projectId) : null,
    { revalidateIfStale: false, revalidateOnFocus: false }
  );

  const states = getProjectStates(projectId);
  const sortedStates = useMemo(() => sortStates([...(states ?? [])]) ?? [], [states]);

  useEffect(() => {
    if (!states) return;
    setDraftAliases((currentDrafts) =>
      states.reduce<Record<string, string>>(
        (acc, state) => ({
          ...acc,
          [state.id]: currentDrafts[state.id] ?? aliasesToText(state.pipeline_aliases),
        }),
        {}
      )
    );
  }, [states]);

  const handleUpdateState = async (state: IState, data: Partial<IState>) => {
    setSavingStateId(state.id);
    try {
      await updateState(workspaceSlug, projectId, state.id, data);
    } finally {
      setSavingStateId(null);
    }
  };

  const handleSaveAliases = async (state: IState) => {
    const nextAliases = normalizeAliases(draftAliases[state.id] ?? "");
    await handleUpdateState(state, { pipeline_aliases: nextAliases });
    setDraftAliases((currentDrafts) => ({ ...currentDrafts, [state.id]: aliasesToText(nextAliases) }));
  };

  if (!states)
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="h-14 w-full animate-pulse rounded border border-subtle bg-surface-2" />
        ))}
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="text-sm rounded border border-subtle bg-surface-1 px-4 py-3 text-secondary">
        {t("project_settings.pipeline.aliases_help")}
      </div>
      <div className="overflow-hidden rounded border border-subtle">
        {sortedStates.map((state) => {
          const isSaving = savingStateId === state.id;
          const isDirty = draftAliases[state.id] !== aliasesToText(state.pipeline_aliases);

          return (
            <div
              key={state.id}
              className="grid grid-cols-[minmax(220px,0.8fr)_minmax(280px,1fr)_auto] items-center gap-4 border-b border-subtle px-4 py-3 last:border-b-0"
            >
              <div className="flex min-w-0 items-center gap-3">
                <StateGroupIcon stateGroup={state.group} color={state.color} size={EIconSize.XL} />
                <div className="min-w-0">
                  <div className="text-sm truncate font-medium text-primary">{state.name}</div>
                  <div className="text-xs text-secondary">{t(`workspace_projects.state.${state.group}`)}</div>
                </div>
              </div>
              <input
                className="text-sm focus:border-custom-primary-100 h-9 rounded border border-subtle bg-transparent px-3 transition-colors outline-none placeholder:text-tertiary"
                value={draftAliases[state.id] ?? ""}
                onChange={(event) =>
                  setDraftAliases((currentDrafts) => ({ ...currentDrafts, [state.id]: event.target.value }))
                }
                onBlur={() => isDirty && handleSaveAliases(state)}
                placeholder={t("project_settings.pipeline.aliases_placeholder")}
                disabled={!isEditable || isSaving}
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className={`text-xs flex h-8 items-center gap-2 rounded border px-3 font-medium transition-colors ${
                    state.is_pipeline_enabled
                      ? "border-transparent bg-accent-primary text-on-color hover:bg-accent-primary/80"
                      : "border-subtle text-secondary hover:bg-surface-2 hover:text-primary"
                  }`}
                  disabled={!isEditable || isSaving}
                  onClick={() => handleUpdateState(state, { is_pipeline_enabled: !state.is_pipeline_enabled })}
                >
                  <Workflow className="h-3.5 w-3.5" />
                  {t("issue.pipeline.label")}
                </button>
                <button
                  type="button"
                  className="text-xs h-8 rounded border border-subtle px-3 font-medium text-secondary transition-colors hover:bg-surface-2 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!isEditable || isSaving || !isDirty}
                  onClick={() => handleSaveAliases(state)}
                >
                  {t("project_settings.pipeline.save_aliases")}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
