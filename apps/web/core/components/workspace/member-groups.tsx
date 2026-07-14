/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import useSWR from "swr";
import { observer } from "mobx-react";
import { UsersRound } from "lucide-react";
import { useWorkspaceGroup } from "@/hooks/store/use-workspace-group";

type TWorkspaceMemberGroups = { workspaceSlug: string; userId: string; className?: string };

export const WorkspaceMemberGroups = observer(function WorkspaceMemberGroups({
  workspaceSlug,
  userId,
  className = "",
}: TWorkspaceMemberGroups) {
  const { workspaceGroups, getGroupMembers, fetchWorkspaceGroups, fetchWorkspaceGroupMembers } = useWorkspaceGroup();

  useSWR(`WORKSPACE_MEMBER_GROUPS_${workspaceSlug}`, async () => {
    const groups = await fetchWorkspaceGroups(workspaceSlug);
    await Promise.all(groups.map((group) => fetchWorkspaceGroupMembers(workspaceSlug, group.id)));
  });

  const groups = workspaceGroups?.filter((group) =>
    getGroupMembers(group.id).some((groupMember) => groupMember.workspace_member.member.id === userId)
  );

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
