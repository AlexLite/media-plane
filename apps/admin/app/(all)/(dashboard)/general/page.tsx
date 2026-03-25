/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
// components
import { PageWrapper } from "@/components/common/page-wrapper";
import { getAdminTranslation, useAdminTranslation } from "@/helpers/i18n";
// hooks
import { useInstance } from "@/hooks/store";
// local imports
import { GeneralConfigurationForm } from "./form";
// types
import type { Route } from "./+types/page";

function GeneralPage() {
  const { t } = useAdminTranslation();
  const { instance, instanceAdmins } = useInstance();

  return (
    <PageWrapper
      header={{
        title: t("general_page_title"),
        description: t("general_page_description"),
      }}
    >
      {instance && instanceAdmins && <GeneralConfigurationForm instance={instance} instanceAdmins={instanceAdmins} />}
    </PageWrapper>
  );
}

export const meta: Route.MetaFunction = () => [{ title: getAdminTranslation("general_page_meta_title") }];

export default observer(GeneralPage);
