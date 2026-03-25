/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import { Controller, useForm } from "react-hook-form";
// plane imports
import { USE_CASES } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { Button } from "@plane/propel/button";
import { CheckIcon } from "@plane/propel/icons";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { TUserProfile } from "@plane/types";
import { EOnboardingSteps } from "@plane/types";
import { cn } from "@plane/utils";
// hooks
import { useUserProfile } from "@/hooks/store/user";
// local imports
import { CommonOnboardingHeader } from "../common";
import type { TProfileSetupFormValues } from "../profile/root";

type Props = {
  handleStepChange: (step: EOnboardingSteps, skipInvites?: boolean) => void;
};

const defaultValues = {
  use_case: [] as string[],
};

const USE_CASE_KEYS: Record<string, string> = {
  "Plan and track product roadmaps": "onboarding_use_case_setup.options.plan_and_track_product_roadmaps",
  "Manage engineering sprints": "onboarding_use_case_setup.options.manage_engineering_sprints",
  "Coordinate cross-functional projects": "onboarding_use_case_setup.options.coordinate_cross_functional_projects",
  "Replace our current tool": "onboarding_use_case_setup.options.replace_current_tool",
  "Just exploring": "onboarding_use_case_setup.options.just_exploring",
};

export const UseCaseSetupStep = observer(function UseCaseSetupStep({ handleStepChange }: Props) {
  const { t } = useTranslation();
  // store hooks
  const { data: profile, updateUserProfile } = useUserProfile();
  // form info
  const {
    handleSubmit,
    control,
    formState: { errors, isSubmitting, isValid },
  } = useForm<TProfileSetupFormValues>({
    defaultValues: {
      ...defaultValues,
      use_case: profile?.use_case ? profile.use_case.split(". ") : [],
    },
    mode: "onChange",
  });

  // handle submit
  const handleSubmitUserPersonalization = async (formData: TProfileSetupFormValues) => {
    const profileUpdatePayload: Partial<TUserProfile> = {
      use_case: formData.use_case && formData.use_case.length > 0 ? formData.use_case.join(". ") : undefined,
    };
    try {
      await Promise.all([
        updateUserProfile(profileUpdatePayload),
        // totalSteps > 2 && stepChange({ profile_complete: true }),
      ]);
      setToast({
        type: TOAST_TYPE.SUCCESS,
        title: t("onboarding_profile_setup.toast.success.title"),
        message: t("onboarding_profile_setup.toast.success.completed"),
      });
    } catch {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: t("onboarding_profile_setup.toast.error.title"),
        message: t("onboarding_profile_setup.toast.error.failed"),
      });
    }
  };

  // on submit
  const onSubmit = async (formData: TProfileSetupFormValues) => {
    if (!profile) return;
    await handleSubmitUserPersonalization(formData);
    handleStepChange(EOnboardingSteps.USE_CASE_SETUP);
  };

  // handle skip
  const handleSkip = () => {
    handleStepChange(EOnboardingSteps.USE_CASE_SETUP);
  };

  // derived values
  const isButtonDisabled = !isSubmitting && isValid ? false : true;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-10">
      {/* Header */}
      <CommonOnboardingHeader
        title={t("onboarding_use_case_setup.title")}
        description={t("onboarding_use_case_setup.description")}
      />

      {/* Use Case Selection */}
      <div className="flex flex-col gap-3">
        <p className="text-body-sm-semibold text-placeholder">{t("onboarding_use_case_setup.select_one_or_more")}</p>

        <Controller
          control={control}
          name="use_case"
          rules={{
            required: t("onboarding_profile_setup.domain.errors.required"),
            validate: (value) => (value && value.length > 0) || t("onboarding_profile_setup.domain.errors.required"),
          }}
          render={({ field: { value, onChange } }) => (
            <div className="flex flex-col gap-3">
              {USE_CASES.map((useCase) => {
                const isSelected = value?.includes(useCase) || false;
                return (
                  <button
                    key={useCase}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const currentValue = value || [];
                      if (isSelected) {
                        // Remove from array
                        onChange(currentValue.filter((item) => item !== useCase));
                      } else {
                        // Add to array
                        onChange([...currentValue, useCase]);
                      }
                    }}
                    className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 transition-all duration-200 ${
                      isSelected
                        ? "border-accent-strong bg-accent-subtle text-accent-primary"
                        : "border-subtle text-tertiary hover:border-strong"
                    }`}
                  >
                    <span
                      className={cn(`flex size-4 items-center justify-center rounded-sm border-2`, {
                        "border-accent-strong bg-accent-primary": isSelected,
                        "border-strong": !isSelected,
                      })}
                    >
                      <CheckIcon
                        className={cn("h-3 w-3 text-on-color", {
                          "opacity-100": isSelected,
                          "opacity-0": !isSelected,
                        })}
                      />
                    </span>

                    <span className="text-body-sm-regular">{t(USE_CASE_KEYS[useCase] ?? useCase)}</span>
                  </button>
                );
              })}
            </div>
          )}
        />
        {errors.use_case && <span className="text-13 text-danger-primary">{errors.use_case.message}</span>}
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <Button variant="primary" type="submit" className="w-full" size="xl" disabled={isButtonDisabled}>
          {t("common.continue")}
        </Button>
        <Button variant="ghost" onClick={handleSkip} className="w-full" size="xl">
          {t("common.skip")}
        </Button>
      </div>
    </form>
  );
});
