/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useTheme } from "next-themes";
// plane imports
import { useTranslation } from "@plane/i18n";
import { Button } from "@plane/propel/button";
// assets
import maintenanceModeDarkModeImage from "@/app/assets/instance/maintenance-mode-dark.svg?url";
import maintenanceModeLightModeImage from "@/app/assets/instance/maintenance-mode-light.svg?url";
// layouts
import DefaultLayout from "@/layouts/default-layout";

const linkMap = [
  {
    key: "mail_to",
    labelKey: "error_page_contact_support",
    value: "mailto:support@plane.so",
  },
  {
    key: "status",
    labelKey: "error_page_status_page",
    value: "https://status.plane.so/",
  },
  {
    key: "twitter_handle",
    labelKey: "error_page_twitter",
    value: "https://x.com/planepowers",
  },
];

// Production Error Component
interface ProdErrorComponentProps {
  onGoHome: () => void;
}

export function ProdErrorComponent({ onGoHome }: ProdErrorComponentProps) {
  // hooks
  const { resolvedTheme } = useTheme();
  const { t } = useTranslation();

  // derived values
  const maintenanceModeImage = resolvedTheme === "dark" ? maintenanceModeDarkModeImage : maintenanceModeLightModeImage;

  return (
    <DefaultLayout>
      <div className="relative container mx-auto flex h-full w-full max-w-xl flex-col items-center justify-center gap-2 gap-y-6 bg-surface-1 px-6 text-center">
        <div className="relative w-full">
          <img
            src={maintenanceModeImage}
            height="176"
            width="288"
            alt="ProjectSettingImg"
            className="h-full w-full object-fill object-center"
          />
        </div>
        <div className="relative mt-4 flex w-full flex-col gap-4">
          <div className="flex flex-col gap-2.5">
            <h1 className="text-left text-18 font-semibold text-primary">{t("error_page_title")}</h1>
            <span className="text-left text-14 font-medium text-secondary">
              {t("error_page_description")}
            </span>
          </div>

          <div className="mt-1 flex items-center justify-start gap-6">
            {linkMap.map((link) => (
              <div key={link.key}>
                <a
                  href={link.value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-13 text-accent-primary hover:underline"
                >
                  {t(link.labelKey)}
                </a>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-start gap-6">
            <Button variant="primary" size="lg" onClick={onGoHome}>
              {t("go_to_home")}
            </Button>
          </div>
        </div>
      </div>
    </DefaultLayout>
  );
}
