/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { getAdminTranslation } from "@/helpers/i18n";

export const CORE_HEADER_SEGMENT_LABELS: Record<string, string> = {
  general: getAdminTranslation("header_general"),
  ai: getAdminTranslation("header_ai"),
  email: getAdminTranslation("header_email"),
  authentication: getAdminTranslation("header_authentication"),
  image: getAdminTranslation("header_image"),
  google: getAdminTranslation("google"),
  github: getAdminTranslation("github"),
  gitlab: getAdminTranslation("gitlab"),
  gitea: getAdminTranslation("gitea"),
  workspace: getAdminTranslation("header_workspace"),
  create: getAdminTranslation("header_create"),
};
