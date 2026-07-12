/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import useSWR from "swr";
import { observer } from "mobx-react";
import { UsersRound } from "lucide-react";
import { EUserPermissions, EUserPermissionsLevel } from "@plane/constants";
import { useMember } from "@/hooks/store/use-member";
import { useWorkspaceGroup } from "@/hooks/store/use-workspace-group";
import { useUserPermissions } from "@/hooks/store/user";

type TWorkspaceMemberGroups = { workspaceSlug: string; userId: string; className?: string };

export const WorkspaceMemberGroups = observer(function WorkspaceMemberGroups({
  workspaceSlug,
  userId,
  className = "",
}: TWorkspaceMemberGroups) {
  const { allowPermissions } = useUserPermissions();
  const { workspace: workspaceMemberStore } = useMember();
  const { workspaceGroups, getGroupMembers, fetchWorkspaceGroups, fetchWorkspaceGroupMembers } = useWorkspaceGroup();
  const canViewGroups = allowPermissions(
    [EUserPermissions.ADMIN, EUserPermissions.MEMBER],
    EUserPermissionsLevel.WORKSPACE
  );

  useSWR(canViewGroups ? `WORKSPACE_MEMBER_GROUPS_${workspaceSlug}` : null, async () => {
    const groups = await fetchWorkspaceGroups(workspaceSlug);
    await Promise.all(groups.map((group) => fetchWorkspaceGroupMembers(workspaceSlug, group.id)));
  });
  useSWR(canViewGroups ? `WORKSPACE_MEMBER_GROUP_MEMBERS_${workspaceSlug}` : null, () =>
    workspaceMemberStore.fetchWorkspaceMembers(workspaceSlug)
  );

  const workspaceMember = workspaceMemberStore.getWorkspaceMemberDetails(userId);
  const groups = workspaceMember
    ? workspaceGroups?.filter((group) =>
        getGroupMembers(group.id).some((groupMember) => groupMember.workspace_member.id === workspaceMember.id)
      )
    : [];

  if (!groups?.length) return null;

  return (
    <div className={`flex flex-wrap items-center gap-1 ${className}`}>
      {groups.map((group) => (
        <span
          key={group.id}
          className="inline-flex items-center gap-1 text-caption-md-regular text-secondary"
          title={group.name}
        >
          <UsersRound className="size-3.5 shrink-0" aria-hidden />
          {group.name.replace(/^\d+(?:-\d+)+\s+/, "")}
        </span>
      ))}
    </div>
  );
});
