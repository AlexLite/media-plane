/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect, useState } from "react";
import { observer } from "mobx-react";
import useSWR from "swr";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import { Loader, ToggleSwitch } from "@plane/ui";
// components
import { PageWrapper } from "@/components/common/page-wrapper";
import { getAdminTranslation, useAdminTranslation } from "@/helpers/i18n";
// hooks
import { useInstance } from "@/hooks/store";
// types
import type { Route } from "./+types/page";
// local
import { InstanceEmailForm } from "./email-config-form";

const InstanceEmailPage = observer(function InstanceEmailPage(_props: Route.ComponentProps) {
  const { t } = useAdminTranslation();
  // store
  const { fetchInstanceConfigurations, formattedConfig, disableEmail } = useInstance();

  const { isLoading } = useSWR("INSTANCE_CONFIGURATIONS", () => fetchInstanceConfigurations());

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSMTPEnabled, setIsSMTPEnabled] = useState(false);

  const handleToggle = async () => {
    if (isSMTPEnabled) {
      setIsSubmitting(true);
      try {
        await disableEmail();
        setIsSMTPEnabled(false);
        setToast({
          title: t("email_feature_disabled_title"),
          message: t("email_feature_disabled_message"),
          type: TOAST_TYPE.SUCCESS,
        });
      } catch (_error) {
        setToast({
          title: t("email_feature_disable_error_title"),
          message: t("email_feature_disable_error_message"),
          type: TOAST_TYPE.ERROR,
        });
      } finally {
        setIsSubmitting(false);
      }
      return;
    }
    setIsSMTPEnabled(true);
  };
  useEffect(() => {
    if (formattedConfig) {
      setIsSMTPEnabled(formattedConfig.ENABLE_SMTP === "1");
    }
  }, [formattedConfig]);

  return (
    <PageWrapper
      header={{
        title: t("email_page_title"),
        description: (
          <>
            {t("email_page_description_intro")}
            <div className="text-13 font-regular text-tertiary">
              {t("email_page_description_note")}&nbsp;
              <span className="text-danger-primary">{t("email_page_description_warning")}</span>
            </div>
          </>
        ),
        actions: isLoading ? (
          <Loader>
            <Loader.Item width="24px" height="16px" className="rounded-full" />
          </Loader>
        ) : (
          <ToggleSwitch value={isSMTPEnabled} onChange={handleToggle} size="sm" disabled={isSubmitting} />
        ),
      }}
    >
      {isSMTPEnabled && !isLoading && (
        <>
          {formattedConfig ? (
            <InstanceEmailForm config={formattedConfig} />
          ) : (
            <Loader className="space-y-10">
              <Loader.Item height="50px" width="75%" />
              <Loader.Item height="50px" width="75%" />
              <Loader.Item height="50px" width="40%" />
              <Loader.Item height="50px" width="40%" />
              <Loader.Item height="50px" width="20%" />
            </Loader>
          )}
        </>
      )}
    </PageWrapper>
  );
});

export const meta: Route.MetaFunction = () => [{ title: getAdminTranslation("email_page_meta_title") }];

export default InstanceEmailPage;
