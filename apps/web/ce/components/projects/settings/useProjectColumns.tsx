/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useState } from "react";
import { observer } from "mobx-react";
import useSWR from "swr";
// plane imports
import { EUserPermissions, EUserPermissionsLevel } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { stringToEmoji } from "@plane/propel/emoji-icon-picker";
import type { IWorkspaceMember, TProjectMembership } from "@plane/types";
import { renderFormattedDate } from "@plane/utils";
// components
import { MemberHeaderColumn } from "@/components/project/member-header-column";
import { AccountTypeColumn, NameColumn } from "@/components/project/settings/member-columns";
// hooks
import { useMember } from "@/hooks/store/use-member";
import { useWorkspaceGroup } from "@/hooks/store/use-workspace-group";
import { useUser, useUserPermissions } from "@/hooks/store/user";
import type { IMemberFilters } from "@/store/member/utils";

export interface RowData extends Pick<TProjectMembership, "original_role"> {
  member: IWorkspaceMember;
}

const getGroupEmoji = (emoji?: string | null) => {
  if (!emoji) return "";
  const storedPickerValue = /^[0-9]+(?:-[0-9]+)*$/.test(emoji);

  return storedPickerValue ? stringToEmoji(emoji) || emoji : emoji;
};

const ProjectGroupColumn = observer(function ProjectGroupColumn({ rowData }: { rowData: RowData }) {
  const { t } = useTranslation();
  const { workspaceGroups, getGroupMembers } = useWorkspaceGroup();
  const userId = rowData.member.id;

  const memberGroups =
    workspaceGroups?.filter((group) =>
      getGroupMembers(group.id).some((groupMember) => {
        const groupMemberUser = groupMember.workspace_member.member;
        const groupMemberUserId = typeof groupMemberUser === "string" ? groupMemberUser : groupMemberUser?.id;

        return groupMemberUserId === userId;
      })
    ) || [];

  if (memberGroups.length === 0) {
    return <span className="text-body-xs-regular text-placeholder">{t("workspace_settings.settings.members.no_group")}</span>;
  }

  return (
    <div className="flex max-w-56 flex-wrap gap-1">
      {memberGroups.map((group) => (
        <span
          key={group.id}
          className="inline-flex max-w-full items-center gap-1 rounded bg-surface-2 px-2 py-0.5 text-body-xs-regular text-primary"
          title={group.name}
        >
          {group.emoji ? <span className="shrink-0">{getGroupEmoji(group.emoji)}</span> : null}
          <span className="truncate">{group.name}</span>
        </span>
      ))}
    </div>
  );
});

type TUseProjectColumnsProps = {
  projectId: string;
  workspaceSlug: string;
};

export const useProjectColumns = (props: TUseProjectColumnsProps) => {
  const { projectId, workspaceSlug } = props;
  // states
  const [removeMemberModal, setRemoveMemberModal] = useState<RowData | null>(null);

  // store hooks
  const { data: currentUser } = useUser();
  const { t } = useTranslation();
  const { allowPermissions, getProjectRoleByWorkspaceSlugAndProjectId } = useUserPermissions();
  const {
    project: {
      filters: { getFilters, updateFilters },
    },
  } = useMember();
  const { fetchWorkspaceGroups, fetchWorkspaceGroupMembers } = useWorkspaceGroup();

  useSWR(workspaceSlug ? `PROJECT_MEMBER_TABLE_GROUPS_${workspaceSlug}` : null, async () => {
    const groups = await fetchWorkspaceGroups(workspaceSlug);
    await Promise.all(groups.map((group) => fetchWorkspaceGroupMembers(workspaceSlug, group.id)));
  });

  // derived values
  const isAdmin = allowPermissions(
    [EUserPermissions.ADMIN],
    EUserPermissionsLevel.PROJECT,
    workspaceSlug.toString(),
    projectId.toString()
  );
  const currentProjectRole =
    getProjectRoleByWorkspaceSlugAndProjectId(workspaceSlug.toString(), projectId.toString()) ?? EUserPermissions.GUEST;

  const displayFilters = getFilters(projectId);

  // handlers
  const handleDisplayFilterUpdate = (filters: Partial<IMemberFilters>) => {
    updateFilters(projectId, filters);
  };

  const columns = [
    {
      key: "Full Name",
      content: "Full name",
      thClassName: "text-left",
      thRender: () => (
        <MemberHeaderColumn
          property="full_name"
          displayFilters={displayFilters}
          handleDisplayFilterUpdate={handleDisplayFilterUpdate}
        />
      ),
      tdRender: (rowData: RowData) => (
        <NameColumn
          rowData={rowData}
          workspaceSlug={workspaceSlug}
          isAdmin={isAdmin}
          currentUser={currentUser}
          setRemoveMemberModal={setRemoveMemberModal}
        />
      ),
    },
    {
      key: "Display Name",
      content: "Display name",
      thRender: () => (
        <MemberHeaderColumn
          property="display_name"
          displayFilters={displayFilters}
          handleDisplayFilterUpdate={handleDisplayFilterUpdate}
        />
      ),
      tdRender: (rowData: RowData) => <div className="w-32">{rowData.member.display_name}</div>,
    },
    {
      key: "Email",
      content: "Email",
      thRender: () => (
        <MemberHeaderColumn
          property="email"
          displayFilters={displayFilters}
          handleDisplayFilterUpdate={handleDisplayFilterUpdate}
        />
      ),
      tdRender: (rowData: RowData) => <div className="w-48 text-secondary">{rowData.member.email}</div>,
    },
    {
      key: "Account Type",
      content: "Account type",
      thRender: () => (
        <MemberHeaderColumn
          property="role"
          displayFilters={displayFilters}
          handleDisplayFilterUpdate={handleDisplayFilterUpdate}
        />
      ),
      tdRender: (rowData: RowData) => (
        <AccountTypeColumn
          rowData={rowData}
          currentProjectRole={currentProjectRole}
          projectId={projectId}
          workspaceSlug={workspaceSlug}
        />
      ),
    },
    {
      key: "Group",
      content: t("workspace_settings.settings.members.details.group"),
      tdRender: (rowData: RowData) => <ProjectGroupColumn rowData={rowData} />,
    },
    {
      key: "Joining Date",
      content: "Joining date",
      thRender: () => (
        <MemberHeaderColumn
          property="joining_date"
          displayFilters={displayFilters}
          handleDisplayFilterUpdate={handleDisplayFilterUpdate}
        />
      ),
      tdRender: (rowData: RowData) => <div>{renderFormattedDate(rowData?.member?.joining_date)}</div>,
    },
  ];
  return {
    columns,
    removeMemberModal,
    setRemoveMemberModal,
    displayFilters,
    handleDisplayFilterUpdate,
  };
};
