/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect } from "react";
// router
import { useParams, useRouter } from "next/navigation";

function BillingSettingsPage() {
  const { workspaceSlug } = useParams();
  const router = useRouter();

  useEffect(() => {
    if (typeof workspaceSlug === "string") router.replace(`/${workspaceSlug}/settings/`);
  }, [router, workspaceSlug]);

  return null;
}

export default BillingSettingsPage;
