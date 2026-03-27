/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { Boxes, Share2, Star, User2 } from "lucide-react";
import { useTranslation } from "@plane/i18n";
import { CheckIcon, CloseIcon } from "@plane/propel/icons";
// components
import { LogoSpinner } from "@/components/common/logo-spinner";
import { EmptySpace, EmptySpaceItem } from "@/components/ui/empty-space";
// constants
import { WORKSPACE_INVITATION } from "@/constants/fetch-keys";
// helpers
import { EPageTypes } from "@/helpers/authentication.helper";
// hooks
import { useUser } from "@/hooks/store/user";
import { useAppRouter } from "@/hooks/use-app-router";
// wrappers
import { AuthenticationWrapper } from "@/lib/wrappers/authentication-wrapper";
import { WorkspaceService } from "@/services/workspace.service";
// services

// service initialization
const workspaceService = new WorkspaceService();

function WorkspaceInvitationPage() {
  // i18n
  const { t } = useTranslation();
  // router
  const router = useAppRouter();
  // query params
  const searchParams = useSearchParams();
  const invitation_id = searchParams.get("invitation_id");
  const slug = searchParams.get("slug");
  const token = searchParams.get("token");
  const emailFromUrl = searchParams.get("email");
  // store hooks
  const { data: currentUser } = useUser();

  const { data: invitationDetail, error } = useSWR(
    invitation_id && slug && WORKSPACE_INVITATION(invitation_id.toString()),
    invitation_id && slug
      ? () => workspaceService.getWorkspaceInvitation(slug.toString(), invitation_id.toString())
      : null
  );

  const isAuthenticatedUser = !!currentUser;
  const emailMatchesCurrentUser = currentUser?.email === invitationDetail?.email;
  const canActWithoutToken = isAuthenticatedUser && emailMatchesCurrentUser;

  const handleAccept = () => {
    if (!invitationDetail) return;
    // If user is authenticated and email matches, use session-based endpoint (no token required)
    const acceptPromise = canActWithoutToken
      ? workspaceService.joinWorkspaces({ invitations: [invitationDetail.id] })
      : workspaceService.joinWorkspace(invitationDetail.workspace.slug, invitationDetail.id, {
          accepted: true,
          email: invitationDetail.email || emailFromUrl,
          token: token,
        });
    void acceptPromise
      .then(() => {
        router.push(`/${invitationDetail.workspace.slug}`);
        return undefined;
      })
      .catch((err: unknown) => console.error(err));
  };

  const handleReject = () => {
    if (!invitationDetail) return;
    void workspaceService
      .joinWorkspace(invitationDetail.workspace.slug, invitationDetail.id, {
        accepted: false,
        email: invitationDetail.email || emailFromUrl,
        token: token,
      })
      .then(() => {
        router.push("/");
        return undefined;
      })
      .catch((err: unknown) => console.error(err));
  };

  return (
    <AuthenticationWrapper pageType={EPageTypes.PUBLIC}>
      <div className="flex h-full w-full flex-col items-center justify-center px-3">
        {invitationDetail && !invitationDetail.responded_at ? (
          error ? (
            <div className="shadow-2xl flex w-full flex-col space-y-4 rounded-sm border border-subtle bg-surface-1 px-4 py-8 text-center md:w-1/3">
              <h2 className="text-18 uppercase">{t("workspace_invitation_page.not_found")}</h2>
            </div>
          ) : (
            <EmptySpace
              title={t("workspace_invitation_page.invited_to", { workspace_name: invitationDetail.workspace.name })}
              description={t("workspace_invitation_page.description")}
            >
              <EmptySpaceItem Icon={CheckIcon} title={t("workspace_invitation_page.accept")} action={handleAccept} />
              <EmptySpaceItem Icon={CloseIcon} title={t("workspace_invitation_page.ignore")} action={handleReject} />
            </EmptySpace>
          )
        ) : error || invitationDetail?.responded_at ? (
          invitationDetail?.accepted ? (
            <EmptySpace
              title={t("workspace_invitation_page.already_member", {
                workspace_name: invitationDetail?.workspace.name,
              })}
              description={t("workspace_invitation_page.description")}
            >
              <EmptySpaceItem Icon={Boxes} title={t("workspace_invitation_page.continue_to_home")} href="/" />
            </EmptySpace>
          ) : (
            <EmptySpace
              title={t("workspace_invitation_page.link_not_active")}
              description={t("workspace_invitation_page.description")}
              link={{ text: t("workspace_invitation_page.start_empty_project"), href: "/" }}
            >
              {!currentUser ? (
                <EmptySpaceItem Icon={User2} title={t("workspace_invitation_page.sign_in_to_continue")} href="/" />
              ) : (
                <EmptySpaceItem Icon={Boxes} title={t("workspace_invitation_page.continue_to_home")} href="/" />
              )}
              <EmptySpaceItem
                Icon={Star}
                title={t("workspace_invitation_page.star_on_github")}
                href="https://github.com/makeplane"
              />
              <EmptySpaceItem
                Icon={Share2}
                title={t("workspace_invitation_page.join_community")}
                href="https://forum.plane.so"
              />
            </EmptySpace>
          )
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <LogoSpinner />
          </div>
        )}
      </div>
    </AuthenticationWrapper>
  );
}

export default observer(WorkspaceInvitationPage);
