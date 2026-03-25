/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
// plane imports
import { useTranslation } from "@plane/i18n";
import { StateGroupIcon } from "@plane/propel/icons";
import type { TStateGroups } from "@plane/types";
// components
import { SingleProgressStats } from "@/components/core/sidebar/single-progress-stats";

export type TStateGroupData = {
  state: string | undefined;
  completed: number;
  total: number;
}[];

type TStateGroupStatComponent = {
  selectedStateGroups: string[];
  handleStateGroupFiltersUpdate: (stateGroup: string | undefined) => void;
  distribution: TStateGroupData;
  totalIssuesCount: number;
  isEditable?: boolean;
};

export const StateGroupStatComponent = observer(function StateGroupStatComponent(props: TStateGroupStatComponent) {
  const { t } = useTranslation();
  const { distribution, isEditable, totalIssuesCount, selectedStateGroups, handleStateGroupFiltersUpdate } = props;
  const defaultStateNameMap: Record<string, string> = {
    backlog: "workspace_projects.state.backlog",
    unstarted: "workspace_projects.state.unstarted",
    "un-started": "workspace_projects.state.unstarted",
    un_started: "workspace_projects.state.unstarted",
    todo: "workspace_projects.state.unstarted",
    "to do": "workspace_projects.state.unstarted",
    "in progress": "workspace_projects.state.started",
    "in-progress": "workspace_projects.state.started",
    in_progress: "workspace_projects.state.started",
    started: "workspace_projects.state.started",
    done: "workspace_projects.state.completed",
    completed: "workspace_projects.state.completed",
    cancelled: "workspace_projects.state.cancelled",
    canceled: "workspace_projects.state.cancelled",
  };

  return (
    <div>
      {distribution.map((group, index) => (
        <SingleProgressStats
          key={index}
          title={
            <div className="flex items-center gap-2">
              <StateGroupIcon stateGroup={group.state as TStateGroups} />
              <span className="text-11 capitalize">
                {group.state
                  ? defaultStateNameMap[group.state.toLowerCase()]
                    ? t(defaultStateNameMap[group.state.toLowerCase()])
                    : group.state
                  : ""}
              </span>
            </div>
          }
          completed={group.completed}
          total={totalIssuesCount}
          {...(isEditable && {
            onClick: () => group.state && handleStateGroupFiltersUpdate(group.state),
            selected: group.state ? selectedStateGroups.includes(group.state) : false,
          })}
        />
      ))}
    </div>
  );
});
