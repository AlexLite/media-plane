/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useMemo, useState } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
import { ArchiveRestore } from "lucide-react";
// plane imports
import { PROJECT_AUTOMATION_ARCHIVE_DAYS, EUserPermissions, EUserPermissionsLevel } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import type { IProject } from "@plane/types";
import { CustomSelect, Loader, ToggleSwitch } from "@plane/ui";
// component
import { SelectMonthModal } from "@/components/automation";
import { SettingsControlItem } from "@/components/settings/control-item";
// hooks
import { useProject } from "@/hooks/store/use-project";
import { useUserPermissions } from "@/hooks/store/user";

type Props = {
  handleChange: (formData: Partial<IProject>) => Promise<void>;
};

const initialValues: Partial<IProject> = { archive_in_days: 7 };

export const AutoArchiveAutomation = observer(function AutoArchiveAutomation(props: Props) {
  const { handleChange } = props;
  // router
  const { workspaceSlug } = useParams();
  // states
  const [monthModal, setmonthModal] = useState(false);
  // store hooks
  const { allowPermissions } = useUserPermissions();
  const { t } = useTranslation();

  const { currentProjectDetails } = useProject();

  const isAdmin = allowPermissions(
    [EUserPermissions.ADMIN],
    EUserPermissionsLevel.PROJECT,
    workspaceSlug?.toString(),
    currentProjectDetails?.id
  );

  const autoArchiveStatus = useMemo(() => {
    if (currentProjectDetails?.archive_in_days) return true;
    return (currentProjectDetails?.archive_in ?? 0) !== 0;
  }, [currentProjectDetails]);

  const handleToggleArchive = async () => {
    if (!autoArchiveStatus) {
      await handleChange({ archive_in_days: 7 });
    } else {
      await handleChange({ archive_in: 0, archive_in_days: null });
    }
  };

  return (
    <>
      <SelectMonthModal
        type="auto-archive"
        initialValues={{
          archive_in_days: currentProjectDetails
            ? (currentProjectDetails.archive_in_days ?? currentProjectDetails.archive_in * 30)
            : initialValues.archive_in_days,
        }}
        isOpen={monthModal}
        handleClose={() => setmonthModal(false)}
        handleChange={handleChange}
      />
      <div className="flex flex-col gap-4 border-b border-subtle py-2">
        <div className="flex items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-sm bg-layer-2">
            <ArchiveRestore className="size-4 shrink-0 text-primary" />
          </div>
          <SettingsControlItem
            title={t("project_settings.automations.auto-archive.title")}
            description={t("project_settings.automations.auto-archive.description")}
            control={
              <ToggleSwitch value={autoArchiveStatus} onChange={handleToggleArchive} size="sm" disabled={!isAdmin} />
            }
          />
        </div>
        {currentProjectDetails ? (
          autoArchiveStatus && (
            <div className="ml-13">
              <div className="flex w-full items-center justify-between gap-2 rounded-sm border border-subtle bg-surface-2 px-5 py-4">
                <div className="w-1/2 text-13 font-medium">
                  {t("project_settings.automations.auto-archive.duration")}
                </div>
                <div className="w-1/2">
                  <CustomSelect
                    value={currentProjectDetails.archive_in_days ?? currentProjectDetails.archive_in * 30}
                    label={t("workspace_projects.common.days_count", {
                      days: currentProjectDetails.archive_in_days ?? currentProjectDetails.archive_in * 30,
                    })}
                    onChange={(val: number) => void handleChange({ archive_in_days: val })}
                    input
                    disabled={!isAdmin}
                  >
                    <>
                      {PROJECT_AUTOMATION_ARCHIVE_DAYS.map((days) => (
                        <CustomSelect.Option key={days} value={days}>
                          <span className="text-13">{t("workspace_projects.common.days_count", { days })}</span>
                        </CustomSelect.Option>
                      ))}

                      <button
                        type="button"
                        className="flex w-full items-center rounded-sm px-1 py-1.5 text-13 text-secondary select-none hover:bg-layer-1"
                        onClick={() => setmonthModal(true)}
                      >
                        {t("common.customize_time_range")}
                      </button>
                    </>
                  </CustomSelect>
                </div>
              </div>
            </div>
          )
        ) : (
          <Loader className="ml-13">
            <Loader.Item height="50px" />
          </Loader>
        )}
      </div>
    </>
  );
});
