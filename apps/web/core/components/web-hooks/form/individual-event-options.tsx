/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { Control } from "react-hook-form";
import { Controller } from "react-hook-form";
import { useTranslation } from "@plane/i18n";
import type { IWebhook } from "@plane/types";
import { Checkbox } from "@plane/ui";

export const INDIVIDUAL_WEBHOOK_OPTIONS: {
  key: keyof IWebhook;
  labelI18nKey: string;
  descriptionI18nKey: string;
}[] = [
  {
    key: "project",
    labelI18nKey: "workspace_settings.settings.webhooks.events.project.label",
    descriptionI18nKey: "workspace_settings.settings.webhooks.events.project.description",
  },
  {
    key: "cycle",
    labelI18nKey: "workspace_settings.settings.webhooks.events.cycle.label",
    descriptionI18nKey: "workspace_settings.settings.webhooks.events.cycle.description",
  },
  {
    key: "issue",
    labelI18nKey: "workspace_settings.settings.webhooks.events.issue.label",
    descriptionI18nKey: "workspace_settings.settings.webhooks.events.issue.description",
  },
  {
    key: "module",
    labelI18nKey: "workspace_settings.settings.webhooks.events.module.label",
    descriptionI18nKey: "workspace_settings.settings.webhooks.events.module.description",
  },
  {
    key: "issue_comment",
    labelI18nKey: "workspace_settings.settings.webhooks.events.issue_comment.label",
    descriptionI18nKey: "workspace_settings.settings.webhooks.events.issue_comment.description",
  },
];

type Props = {
  control: Control<IWebhook, any>;
};

export function WebhookIndividualEventOptions({ control }: Props) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-8 px-6 lg:grid-cols-2">
      {INDIVIDUAL_WEBHOOK_OPTIONS.map((option) => (
        <Controller
          key={option.key}
          control={control}
          name={option.key}
          render={({ field: { onChange, value } }) => (
            <div>
              <div className="flex items-center gap-2">
                <Checkbox id={option.key} onChange={() => onChange(!value)} checked={value === true} />
                <label className="text-13" htmlFor={option.key}>
                  {t(option.labelI18nKey)}
                </label>
              </div>
              <p className="mt-0.5 ml-6 text-11 text-tertiary">{t(option.descriptionI18nKey)}</p>
            </div>
          )}
        />
      ))}
    </div>
  );
}
