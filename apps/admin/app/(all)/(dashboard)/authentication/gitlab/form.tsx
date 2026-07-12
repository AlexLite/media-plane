/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useState } from "react";
import { isEmpty } from "lodash-es";
import Link from "next/link";
import { useForm } from "react-hook-form";
// plane internal packages
import { API_BASE_URL } from "@plane/constants";
import { Button, getButtonStyling } from "@plane/propel/button";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { IFormattedInstanceConfiguration, TInstanceGitlabAuthenticationConfigurationKeys } from "@plane/types";
// components
import { CodeBlock } from "@/components/common/code-block";
import { ConfirmDiscardModal } from "@/components/common/confirm-discard-modal";
import type { TControllerInputFormField } from "@/components/common/controller-input";
import type { TControllerSwitchFormField } from "@/components/common/controller-switch";
import { ControllerSwitch } from "@/components/common/controller-switch";
import { ControllerInput } from "@/components/common/controller-input";
import type { TCopyField } from "@/components/common/copy-field";
import { CopyField } from "@/components/common/copy-field";
import { useAdminTranslation } from "@/helpers/i18n";
// hooks
import { useInstance } from "@/hooks/store";

type Props = {
  config: IFormattedInstanceConfiguration;
};

type GitlabConfigFormValues = Record<TInstanceGitlabAuthenticationConfigurationKeys, string>;

export function InstanceGitlabConfigForm(props: Props) {
  const { config } = props;
  const { t } = useAdminTranslation();
  // states
  const [isDiscardChangesModalOpen, setIsDiscardChangesModalOpen] = useState(false);
  // store hooks
  const { updateInstanceConfigurations } = useInstance();
  // form data
  const {
    handleSubmit,
    control,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<GitlabConfigFormValues>({
    defaultValues: {
      GITLAB_HOST: config["GITLAB_HOST"],
      GITLAB_CLIENT_ID: config["GITLAB_CLIENT_ID"],
      GITLAB_CLIENT_SECRET: config["GITLAB_CLIENT_SECRET"],
      ENABLE_GITLAB_SYNC: config["ENABLE_GITLAB_SYNC"] || "0",
    },
  });

  const originURL = !isEmpty(API_BASE_URL) ? API_BASE_URL : typeof window !== "undefined" ? window.location.origin : "";

  const GITLAB_FORM_FIELDS: TControllerInputFormField[] = [
    {
      key: "GITLAB_HOST",
      type: "text",
      label: t("host"),
      description: (
        <>
          {t("oauth_gitlab_host_description_prefix")} <CodeBlock>{t("oauth_gitlab_domain_tld")}</CodeBlock>{" "}
          {t("oauth_gitlab_host_description_suffix")}
        </>
      ),
      placeholder: "https://gitlab.com",
      error: Boolean(errors.GITLAB_HOST),
      required: true,
    },
    {
      key: "GITLAB_CLIENT_ID",
      type: "text",
      label: t("oauth_application_id"),
      description: (
        <>
          {t("oauth_gitlab_application_id_description_prefix")}{" "}
          <a
            tabIndex={-1}
            href="https://docs.gitlab.com/ee/integration/oauth_provider.html"
            target="_blank"
            className="text-accent-primary hover:underline"
            rel="noreferrer"
          >
            {t("oauth_gitlab_application_settings")}
          </a>
          .
        </>
      ),
      placeholder: "c2ef2e7fc4e9d15aa7630f5637d59e8e4a27ff01dceebdb26b0d267b9adcf3c3",
      error: Boolean(errors.GITLAB_CLIENT_ID),
      required: true,
    },
    {
      key: "GITLAB_CLIENT_SECRET",
      type: "password",
      label: t("oauth_secret"),
      description: (
        <>
          {t("oauth_gitlab_secret_description_prefix")}{" "}
          <a
            tabIndex={-1}
            href="https://docs.gitlab.com/ee/integration/oauth_provider.html"
            target="_blank"
            className="text-accent-primary hover:underline"
            rel="noreferrer"
          >
            {t("oauth_gitlab_application_settings")}
          </a>
          .
        </>
      ),
      placeholder: "gloas-f79cfa9a03c97f6ffab303177a5a6778a53c61e3914ba093412f68a9298a1b28",
      error: Boolean(errors.GITLAB_CLIENT_SECRET),
      required: true,
    },
  ];

  const GITLAB_FORM_SWITCH_FIELD: TControllerSwitchFormField<GitlabConfigFormValues> = {
    name: "ENABLE_GITLAB_SYNC",
    label: t("gitlab"),
  };

  const GITLAB_SERVICE_FIELD: TCopyField[] = [
    {
      key: "Callback_URL",
      label: t("oauth_callback_url"),
      url: `${originURL}/auth/gitlab/callback/`,
      description: (
        <>
          {t("oauth_autogenerate_paste_into")} <CodeBlock darkerShade>{t("oauth_redirect_uri")}</CodeBlock>{" "}
          {t("oauth_field_of_your")}{" "}
          <a
            tabIndex={-1}
            href="https://docs.gitlab.com/ee/integration/oauth_provider.html"
            target="_blank"
            className="text-accent-primary hover:underline"
            rel="noreferrer"
          >
            {t("oauth_gitlab_application")}
          </a>
          .
        </>
      ),
    },
  ];

  const onSubmit = async (formData: GitlabConfigFormValues) => {
    const payload: Partial<GitlabConfigFormValues> = { ...formData };

    try {
      const response = await updateInstanceConfigurations(payload);
      setToast({
        type: TOAST_TYPE.SUCCESS,
        title: t("done"),
        message: t("gitlab_auth_configured_test_now"),
      });
      reset({
        GITLAB_HOST: response.find((item) => item.key === "GITLAB_HOST")?.value,
        GITLAB_CLIENT_ID: response.find((item) => item.key === "GITLAB_CLIENT_ID")?.value,
        GITLAB_CLIENT_SECRET: response.find((item) => item.key === "GITLAB_CLIENT_SECRET")?.value,
        ENABLE_GITLAB_SYNC: response.find((item) => item.key === "ENABLE_GITLAB_SYNC")?.value,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleGoBack = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    if (isDirty) {
      e.preventDefault();
      setIsDiscardChangesModalOpen(true);
    }
  };

  return (
    <>
      <ConfirmDiscardModal
        isOpen={isDiscardChangesModalOpen}
        onDiscardHref="/authentication"
        handleClose={() => setIsDiscardChangesModalOpen(false)}
      />
      <div className="flex flex-col gap-8">
        <div className="grid w-full grid-cols-2 gap-x-12 gap-y-8">
          <div className="col-span-2 flex flex-col gap-y-4 pt-1 md:col-span-1">
            <div className="pt-2.5 text-18 font-medium">{t("gitlab_provided_details_for_plane")}</div>
            {GITLAB_FORM_FIELDS.map((field) => (
              <ControllerInput
                key={field.key}
                control={control}
                type={field.type}
                name={field.key}
                label={field.label}
                description={field.description}
                placeholder={field.placeholder}
                error={field.error}
                required={field.required}
              />
            ))}
            <ControllerSwitch control={control} field={GITLAB_FORM_SWITCH_FIELD} />
            <div className="flex flex-col gap-1 pt-4">
              <div className="flex items-center gap-4">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={(e) => void handleSubmit(onSubmit)(e)}
                  loading={isSubmitting}
                  disabled={!isDirty}
                >
                  {isSubmitting ? t("saving") : t("save_changes")}
                </Button>
                <Link href="/authentication" className={getButtonStyling("secondary", "lg")} onClick={handleGoBack}>
                  {t("go_back")}
                </Link>
              </div>
            </div>
          </div>
          <div className="col-span-2 md:col-span-1">
            <div className="flex flex-col gap-y-4 rounded-lg bg-layer-3 px-6 pt-1.5 pb-4">
              <div className="pt-2 text-18 font-medium">{t("plane_provided_details_for_gitlab")}</div>
              {GITLAB_SERVICE_FIELD.map((field) => (
                <CopyField key={field.key} label={field.label} url={field.url} description={field.description} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
