/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Settings, UserPlus } from "lucide-react";
import { Menu } from "@headlessui/react";
// plane imports
import { EUserPermissions } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { CheckIcon } from "@plane/propel/icons";
import type { IWorkspace } from "@plane/types";
import { cn, getFileURL } from "@plane/utils";
// plane web imports
import { SubscriptionPill } from "@/plane-web/components/common/subscription/subscription-pill";


const getTranslatedWorkspaceRole = (role: EUserPermissions | undefined, t: (key: string) => string) => {
  switch (role) {
    case EUserPermissions.ADMIN:
      return t("workspace_member_roles.admin");
    case EUserPermissions.MEMBER:
      return t("workspace_member_roles.member");
    case EUserPermissions.GUEST:
      return t("workspace_member_roles.guest");
    default:
      return t("workspace_member_roles.guest");
  }
};

type TProps = {
  workspace: IWorkspace;
  activeWorkspace: IWorkspace | null;
  handleItemClick: () => void;
  handleWorkspaceNavigation: (workspace: IWorkspace) => void;
  handleClose: () => void;
};
const SidebarDropdownItem = observer(function SidebarDropdownItem(props: TProps) {
  const { workspace, activeWorkspace, handleItemClick, handleWorkspaceNavigation, handleClose } = props;
  // router
  const { workspaceSlug } = useParams();
  const router = useRouter();
  // hooks
  const { t } = useTranslation();

  return (
    <div
      key={workspace.id}
      onClick={() => {
        handleWorkspaceNavigation(workspace);
        handleItemClick();
        router.push(`/${workspace.slug}`);
      }}
      className="w-full cursor-pointer"
      id={workspace.id}
    >
      <Menu.Item
        as="div"
        className={cn("px-4 py-2", {
          "bg-layer-transparent-active": workspace.id === activeWorkspace?.id,
          "hover:bg-layer-transparent-hover": workspace.id !== activeWorkspace?.id,
        })}
      >
        <div className="flex items-center justify-between gap-1 rounded-sm p-1 text-13 text-primary">
          <div className="relative flex min-w-0 flex-1 items-center justify-start gap-2.5">
            <span
              className={`relative flex h-8 w-8 flex-shrink-0 items-center justify-center border-subtle p-2 text-14 font-medium uppercase ${
                !workspace?.logo_url && "rounded-md bg-[#026292] text-on-color"
              }`}
            >
              {workspace?.logo_url && workspace.logo_url !== "" ? (
                <img
                  src={getFileURL(workspace.logo_url)}
                  className="absolute top-0 left-0 h-full w-full rounded-sm object-cover"
                  alt={t("workspace_logo")}
                />
              ) : (
                (workspace?.name?.[0] ?? "...")
              )}
            </span>
            <div className="w-[inherit]">
              <div className="flex min-w-0 items-center gap-1.5">
                <div
                  className={`truncate text-left text-13 font-medium text-ellipsis ${workspaceSlug === workspace.slug ? "" : "text-secondary"}`}
                >
                  {workspace.name}
                </div>
                {workspace.id === activeWorkspace?.id && <CheckIcon className="size-4 shrink-0 text-primary" />}
              </div>
              <div className="flex w-fit gap-2 text-13 text-tertiary">
                <span>{getTranslatedWorkspaceRole(workspace.role, t)}</span>
                <div className="m-auto h-1 w-1 rounded-full bg-layer-1/50" />
                <span className="capitalize">{t("member", { count: workspace.total_members || 0 })}</span>
              </div>
            </div>
          </div>
          {workspace.id !== activeWorkspace?.id && (
            <SubscriptionPill workspace={workspace} />
          )}
        </div>
        {workspace.id === activeWorkspace?.id && (
          <>
            <div className="mt-2 mb-1 flex gap-2">
              {[EUserPermissions.ADMIN, EUserPermissions.MEMBER].includes(workspace?.role) && (
                <Link
                  href={`/${workspace.slug}/settings`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClose();
                  }}
                  className="flex gap-1.5 rounded-md border border-strong bg-layer-2 px-2.5 py-1.5 text-secondary transition-colors hover:border-strong hover:text-secondary hover:shadow-raised-100"
                >
                  <Settings className="my-auto h-4 w-4 flex-shrink-0" />
                  <span className="my-auto text-13 font-medium whitespace-nowrap">{t("settings")}</span>
                </Link>
              )}
              {[EUserPermissions.ADMIN].includes(workspace?.role) && (
                <Link
                  href={`/${workspace.slug}/settings/members`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClose();
                  }}
                  className="flex gap-1.5 rounded-md border border-strong bg-layer-2 px-2.5 py-1.5 text-secondary transition-colors hover:border-strong hover:text-secondary hover:shadow-raised-100"
                >
                  <UserPlus className="my-auto h-4 w-4 flex-shrink-0" />
                  <span className="my-auto text-13 font-medium whitespace-nowrap">
                    {t("workspace_settings.settings.members.details.invite")}
                  </span>
                </Link>
              )}
            </div>
          </>
        )}
      </Menu.Item>
    </div>
  );
});

export default SidebarDropdownItem;
