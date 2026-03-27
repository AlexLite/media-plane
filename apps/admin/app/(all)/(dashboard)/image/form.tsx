/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useForm } from "react-hook-form";
import { Button } from "@plane/propel/button";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { IFormattedInstanceConfiguration, TInstanceImageConfigurationKeys } from "@plane/types";
// components
import { ControllerInput } from "@/components/common/controller-input";
import { useAdminTranslation } from "@/helpers/i18n";
// hooks
import { useInstance } from "@/hooks/store";

type IInstanceImageConfigForm = {
  config: IFormattedInstanceConfiguration;
};

type ImageConfigFormValues = Record<TInstanceImageConfigurationKeys, string>;

export function InstanceImageConfigForm(props: IInstanceImageConfigForm) {
  const { config } = props;
  const { t } = useAdminTranslation();
  // store hooks
  const { updateInstanceConfigurations } = useInstance();
  // form data
  const {
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ImageConfigFormValues>({
    defaultValues: {
      UNSPLASH_ACCESS_KEY: config["UNSPLASH_ACCESS_KEY"],
    },
  });

  const onSubmit = async (formData: ImageConfigFormValues) => {
    const payload: Partial<ImageConfigFormValues> = { ...formData };

    await updateInstanceConfigurations(payload)
      .then(() =>
        setToast({
          type: TOAST_TYPE.SUCCESS,
          title: t("success"),
          message: t("image_config_updated_successfully"),
        })
      )
      .catch((err) => console.error(err));
  };

  return (
    <div className="space-y-8">
      <div className="grid-col grid w-full grid-cols-1 items-center justify-between gap-x-16 gap-y-8 lg:grid-cols-2">
        <ControllerInput
          control={control}
          type="password"
          name="UNSPLASH_ACCESS_KEY"
          label={t("access_key_unsplash")}
          description={
            <>
              {t("unsplash_access_key_help_prefix")}&nbsp;
              <a
                href="https://unsplash.com/documentation#creating-a-developer-account"
                target="_blank"
                className="text-accent-primary hover:underline"
                rel="noreferrer"
              >
                {t("learn_more")}
              </a>
            </>
          }
          placeholder={t("unsplash_access_key_placeholder")}
          error={Boolean(errors.UNSPLASH_ACCESS_KEY)}
          required
        />
      </div>

      <div>
        <Button variant="primary" size="lg" onClick={handleSubmit(onSubmit)} loading={isSubmitting}>
          {isSubmitting ? t("saving") : t("save_changes")}
        </Button>
      </div>
    </div>
  );
}
