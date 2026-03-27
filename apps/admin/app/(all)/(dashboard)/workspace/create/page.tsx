/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
// components
import { PageWrapper } from "@/components/common/page-wrapper";
import { getAdminTranslation, useAdminTranslation } from "@/helpers/i18n";
// types
import type { Route } from "./+types/page";
// local
import { WorkspaceCreateForm } from "./form";

const WorkspaceCreatePage = observer(function WorkspaceCreatePage(_props: Route.ComponentProps) {
  const { t } = useAdminTranslation();
  return (
    <PageWrapper
      header={{
        title: t("workspace_create_page_title"),
        description: t("workspace_create_page_description"),
      }}
    >
      <WorkspaceCreateForm />
    </PageWrapper>
  );
});

export const meta: Route.MetaFunction = () => [{ title: getAdminTranslation("workspace_create_page_meta_title") }];

export default WorkspaceCreatePage;
