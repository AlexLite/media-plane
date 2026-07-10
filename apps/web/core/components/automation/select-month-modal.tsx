/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useState } from "react";
import { useParams } from "next/navigation";
// react-hook-form
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "@plane/i18n";
import { Button } from "@plane/propel/button";
import type { IProject } from "@plane/types";
// ui
import { Input, EModalPosition, EModalWidth, ModalCore } from "@plane/ui";

// types
type Props = {
  isOpen: boolean;
  type: "auto-close" | "auto-archive";
  initialValues: Partial<IProject>;
  handleClose: () => void;
  handleChange: (formData: Partial<IProject>) => Promise<void>;
};

export function SelectMonthModal({ type, initialValues, isOpen, handleClose, handleChange }: Props) {
  const { t } = useTranslation();
  const { workspaceSlug, projectId } = useParams();
  const [archiveUnit, setArchiveUnit] = useState<"months" | "days">(
    initialValues.archive_in_days ? "days" : "months"
  );

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    control,
    reset,
  } = useForm<IProject>({
    defaultValues: initialValues,
  });

  const onClose = () => {
    handleClose();
    reset(initialValues);
    setArchiveUnit(initialValues.archive_in_days ? "days" : "months");
  };

  const onSubmit = (formData: Partial<IProject>) => {
    if (!workspaceSlug && !projectId) return;
    if (type === "auto-archive") {
      if (archiveUnit === "months") {
        void handleChange({ archive_in: Number(formData.archive_in), archive_in_days: null });
      } else {
        void handleChange({ archive_in: 0, archive_in_days: Number(formData.archive_in_days) });
      }
    } else {
      void handleChange(formData);
    }
    onClose();
  };

  return (
    <ModalCore isOpen={isOpen} handleClose={onClose} position={EModalPosition.CENTER} width={EModalWidth.XXL}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div>
          <h3 className="text-16 leading-6 font-medium text-primary">
            {t("project_settings.automations.select_month_modal.title")}
          </h3>
          <div className="mt-8 flex items-center gap-2">
            <div className="flex w-full flex-col justify-center gap-1">
              {type === "auto-close" ? (
                <>
                  <Controller
                    control={control}
                    name="close_in"
                    rules={{
                      required: t("project_settings.automations.select_month_modal.errors.month_range"),
                      min: 1,
                      max: 12,
                    }}
                    render={({ field: { value, onChange, ref } }) => (
                      <div className="relative flex w-full flex-col justify-center gap-1">
                        <Input
                          id="close_in"
                          name="close_in"
                          type="number"
                          value={value?.toString()}
                          onChange={onChange}
                          ref={ref}
                          hasError={Boolean(errors.close_in)}
                          placeholder={t("project_settings.automations.select_month_modal.months_placeholder")}
                          className="w-full border-subtle"
                          min={1}
                          max={12}
                        />
                        <span className="absolute top-2.5 right-8 text-13 text-secondary">
                          {t("project_settings.automations.select_month_modal.months_label")}
                        </span>
                      </div>
                    )}
                  />

                  {errors.close_in && (
                    <span className="px-1 text-13 text-danger-primary">
                      {t("project_settings.automations.select_month_modal.errors.month_range")}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <div className="mb-3 flex gap-2">
                    {(["months", "days"] as const).map((unit) => (
                      <Button
                        key={unit}
                        type="button"
                        size="sm"
                        variant={archiveUnit === unit ? "primary" : "secondary"}
                        onClick={() => setArchiveUnit(unit)}
                      >
                        {t(`project_settings.automations.select_month_modal.${unit}_label`)}
                      </Button>
                    ))}
                  </div>
                  <Controller
                    control={control}
                    name={archiveUnit === "months" ? "archive_in" : "archive_in_days"}
                    rules={{
                      required: t(
                        `project_settings.automations.select_month_modal.errors.${archiveUnit === "months" ? "month" : "day"}_range`
                      ),
                      min: archiveUnit === "months" ? 1 : 7,
                      max: archiveUnit === "months" ? 12 : 365,
                    }}
                    render={({ field: { value, onChange, ref } }) => (
                      <div className="relative flex w-full flex-col justify-center gap-1">
                        <Input
                          id={archiveUnit === "months" ? "archive_in" : "archive_in_days"}
                          name={archiveUnit === "months" ? "archive_in" : "archive_in_days"}
                          type="number"
                          value={value?.toString()}
                          onChange={onChange}
                          ref={ref}
                          hasError={Boolean(errors.archive_in || errors.archive_in_days)}
                          placeholder={t(`project_settings.automations.select_month_modal.${archiveUnit}_placeholder`)}
                          className="w-full border-subtle"
                          min={archiveUnit === "months" ? 1 : 7}
                          max={archiveUnit === "months" ? 12 : 365}
                        />
                        <span className="absolute top-2.5 right-8 text-13 text-secondary">
                          {t(`project_settings.automations.select_month_modal.${archiveUnit}_label`)}
                        </span>
                      </div>
                    )}
                  />
                  {(errors.archive_in || errors.archive_in_days) && (
                    <span className="px-1 text-13 text-danger-primary">
                      {t(
                        `project_settings.automations.select_month_modal.errors.${archiveUnit === "months" ? "month" : "day"}_range`
                      )}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" size="lg" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button variant="primary" size="lg" type="submit" loading={isSubmitting}>
            {isSubmitting ? t("project_settings.automations.select_month_modal.submitting") : t("common.submit")}
          </Button>
        </div>
      </form>
    </ModalCore>
  );
}
