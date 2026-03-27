/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { Image, BrainCog, Cog, Mail } from "lucide-react";
// plane imports
import { LockIcon, WorkspaceIcon } from "@plane/propel/icons";
import { getAdminTranslation } from "@/helpers/i18n";
// types
import type { TSidebarMenuItem } from "./types";

export type TCoreSidebarMenuKey = "general" | "email" | "workspace" | "authentication" | "ai" | "image";

export const coreSidebarMenuLinks: Record<TCoreSidebarMenuKey, TSidebarMenuItem> = {
  general: {
    Icon: Cog,
    name: getAdminTranslation("sidebar_general"),
    description: getAdminTranslation("sidebar_general_description"),
    href: `/general/`,
  },
  email: {
    Icon: Mail,
    name: getAdminTranslation("sidebar_email"),
    description: getAdminTranslation("sidebar_email_description"),
    href: `/email/`,
  },
  workspace: {
    Icon: WorkspaceIcon,
    name: getAdminTranslation("sidebar_workspaces"),
    description: getAdminTranslation("sidebar_workspaces_description"),
    href: `/workspace/`,
  },
  authentication: {
    Icon: LockIcon,
    name: getAdminTranslation("sidebar_authentication"),
    description: getAdminTranslation("sidebar_authentication_description"),
    href: `/authentication/`,
  },
  ai: {
    Icon: BrainCog,
    name: getAdminTranslation("sidebar_ai"),
    description: getAdminTranslation("sidebar_ai_description"),
    href: `/ai/`,
  },
  image: {
    Icon: Image,
    name: getAdminTranslation("sidebar_images"),
    description: getAdminTranslation("sidebar_images_description"),
    href: `/image/`,
  },
};
