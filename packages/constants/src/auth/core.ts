/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { TCoreLoginMediums } from "@plane/types";

export const CORE_LOGIN_MEDIUM_LABELS: Record<TCoreLoginMediums, string> = {
  email: "Email password",
  "magic-code": "Email code",
  github: "GitHub",
  gitlab: "GitLab",
  google: "Google",
  gitea: "Gitea",
};

export const CORE_LOGIN_MEDIUM_I18N_LABELS: Record<TCoreLoginMediums, string> = {
  email: "auth.login_medium.email",
  "magic-code": "auth.login_medium.magic_code",
  github: "auth.login_medium.github",
  gitlab: "auth.login_medium.gitlab",
  google: "auth.login_medium.google",
  gitea: "auth.login_medium.gitea",
};
