/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useRef, useState } from "react";
import { observer } from "mobx-react";
import { Pencil, Plus, SmilePlus, Trash2, X } from "lucide-react";
import useSWR from "swr";
// plane imports
import { EUserPermissions, EUserPermissionsLevel } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { Button } from "@plane/propel/button";
import { EmptyStateCompact } from "@plane/propel/empty-state";
import { EmojiIconPickerTypes, EmojiPicker, stringToEmoji } from "@plane/propel/emoji-icon-picker";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { IWorkspaceGroup, IWorkspaceGroupMember, IWorkspaceMember } from "@plane/types";
// components
import { NotAuthorizedView } from "@/components/auth-screens/not-authorized-view";
import { Avatar } from "@plane/ui";
import { PageHead } from "@/components/core/page-title";
import { SettingsContentWrapper } from "@/components/settings/content-wrapper";
import { SettingsHeading } from "@/components/settings/heading";
// hooks
import { useWorkspace } from "@/hooks/store/use-workspace";
import { useWorkspaceGroup } from "@/hooks/store/use-workspace-group";
import { useMember } from "@/hooks/store/use-member";
import { useUserPermissions } from "@/hooks/store/user";
// local imports
import type { Route } from "./+types/page";
import { GroupsWorkspaceSettingsHeader } from "./header";

type GroupFormData = {
  name: string;
  color: string;
  emoji: string;
  description: string;
};

const DEFAULT_FORM: GroupFormData = {
  name: "",
  color: "#6d7b8a",
  emoji: "",
  description: "",
};

const getGroupEmoji = (emoji?: string | null) => {
  if (!emoji) return "";
  const storedPickerValue = /^[0-9]+(?:-[0-9]+)*$/.test(emoji);

  return storedPickerValue ? stringToEmoji(emoji) || emoji : emoji;
};

const WorkspaceGroupsSettingsPage = observer(function WorkspaceGroupsSettingsPage({ params }: Route.ComponentProps) {
  const { workspaceSlug } = params;
  const { t } = useTranslation();
  const { currentWorkspace } = useWorkspace();
  const { workspaceUserInfo, allowPermissions } = useUserPermissions();
  const {
    workspaceGroups,
    getGroupMembers,
    fetchWorkspaceGroups,
    createWorkspaceGroup,
    updateWorkspaceGroup,
    deleteWorkspaceGroup,
    fetchWorkspaceGroupMembers,
    addWorkspaceGroupMember,
    deleteWorkspaceGroupMember,
  } = useWorkspaceGroup();
  const { workspace: workspaceMemberStore } = useMember();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [formData, setFormData] = useState<GroupFormData>(DEFAULT_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<Record<string, string>>({});
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const formRef = useRef<HTMLDivElement | null>(null);

  const canViewGroups = allowPermissions(
    [EUserPermissions.ADMIN, EUserPermissions.MEMBER],
    EUserPermissionsLevel.WORKSPACE
  );
  const canManageGroups = allowPermissions(
    [EUserPermissions.ADMIN, EUserPermissions.MEMBER],
    EUserPermissionsLevel.WORKSPACE
  );

  useSWR(canViewGroups ? `WORKSPACE_GROUPS_${workspaceSlug}` : null, () => fetchWorkspaceGroups(workspaceSlug));
  useSWR(canViewGroups ? `WORKSPACE_MEMBERS_${workspaceSlug}` : null, () =>
    workspaceMemberStore.fetchWorkspaceMembers(workspaceSlug)
  );
  useSWR(canViewGroups && workspaceGroups ? `WORKSPACE_GROUP_MEMBERS_${workspaceSlug}` : null, async () => {
    await Promise.all(workspaceGroups?.map((group) => fetchWorkspaceGroupMembers(workspaceSlug, group.id)) || []);
  });

  const pageTitle = currentWorkspace?.name
    ? `${currentWorkspace.name} - ${t("workspace_settings.settings.groups.title")}`
    : undefined;

  const resetForm = () => {
    setFormData(DEFAULT_FORM);
    setEditingGroupId(null);
    setIsFormOpen(false);
    setIsEmojiPickerOpen(false);
  };

  const openCreateForm = () => {
    setFormData(DEFAULT_FORM);
    setEditingGroupId(null);
    setIsFormOpen(true);
    window.setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };

  const openEditForm = (group: IWorkspaceGroup) => {
    setFormData({
      name: group.name,
      color: group.color || DEFAULT_FORM.color,
      emoji: group.emoji || "",
      description: group.description || "",
    });
    setEditingGroupId(group.id);
    setIsFormOpen(true);
    window.setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };

  const handleSubmit = async () => {
    const payload = {
      name: formData.name.trim(),
      color: formData.color.trim(),
      emoji: formData.emoji.trim(),
      description: formData.description.trim(),
    };

    if (!payload.name) {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: t("common.error.label"),
        message: t("workspace_settings.settings.groups.errors.name_required"),
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingGroupId) await updateWorkspaceGroup(workspaceSlug, editingGroupId, payload);
      else await createWorkspaceGroup(workspaceSlug, payload);

      setToast({
        type: TOAST_TYPE.SUCCESS,
        title: t("common.success"),
        message: editingGroupId
          ? t("workspace_settings.settings.groups.toasts.updated")
          : t("workspace_settings.settings.groups.toasts.created"),
      });
      resetForm();
    } catch (error: any) {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: t("common.error.label"),
        message: error?.name?.[0] || error?.error || t("something_went_wrong_please_try_again"),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const workspaceMemberIds = workspaceMemberStore.getWorkspaceMemberIds(workspaceSlug);

  const getMemberName = (member?: IWorkspaceMember | null) =>
    member?.member?.display_name || member?.member?.email || t("workspace_settings.settings.groups.unknown_member");

  const handleArchive = async (groupId: string) => {
    try {
      await deleteWorkspaceGroup(workspaceSlug, groupId);
      setToast({
        type: TOAST_TYPE.SUCCESS,
        title: t("common.success"),
        message: t("workspace_settings.settings.groups.toasts.archived"),
      });
    } catch (error: any) {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: t("common.error.label"),
        message: error?.error || t("something_went_wrong_please_try_again"),
      });
    }
  };

  const handleAddMember = async (group: IWorkspaceGroup) => {
    const workspaceMemberId = selectedMemberIds[group.id];
    if (!workspaceMemberId) return;

    try {
      await addWorkspaceGroupMember(workspaceSlug, group.id, workspaceMemberId);
      setSelectedMemberIds((current) => ({ ...current, [group.id]: "" }));
      setToast({
        type: TOAST_TYPE.SUCCESS,
        title: t("common.success"),
        message: t("workspace_settings.settings.groups.toasts.member_added"),
      });
    } catch (error: any) {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: t("common.error.label"),
        message:
          error?.workspace_member_id?.[0] ||
          error?.error ||
          t("something_went_wrong_please_try_again"),
      });
    }
  };

  const handleRemoveMember = async (group: IWorkspaceGroup, groupMember: IWorkspaceGroupMember) => {
    try {
      await deleteWorkspaceGroupMember(workspaceSlug, group.id, groupMember.id);
      setToast({
        type: TOAST_TYPE.SUCCESS,
        title: t("common.success"),
        message: t("workspace_settings.settings.groups.toasts.member_removed"),
      });
    } catch (error: any) {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: t("common.error.label"),
        message: error?.error || t("something_went_wrong_please_try_again"),
      });
    }
  };

  if (workspaceUserInfo && !canViewGroups) {
    return <NotAuthorizedView section="settings" className="h-auto" />;
  }

  return (
    <SettingsContentWrapper header={<GroupsWorkspaceSettingsHeader />}>
      <PageHead title={pageTitle} />
      <SettingsHeading
        title={t("workspace_settings.settings.groups.title")}
        description={t("workspace_settings.settings.groups.description")}
        control={
          canManageGroups ? (
            <Button variant="primary" size="lg" onClick={openCreateForm}>
              {t("workspace_settings.settings.groups.add_group")}
            </Button>
          ) : undefined
        }
      />

      {isFormOpen && canManageGroups && (
        <div ref={formRef} className="mt-5 scroll-mt-20 rounded-md border border-subtle bg-surface-1 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h5 className="text-h5-medium">
              {editingGroupId
                ? t("workspace_settings.settings.groups.edit_group")
                : t("workspace_settings.settings.groups.create_group")}
            </h5>
            <button type="button" onClick={resetForm} className="rounded p-1 text-secondary hover:bg-surface-2">
              <X className="size-4" />
            </button>
          </div>
          <div className="grid gap-3">
            <label className="grid gap-1.5 text-body-sm-medium">
              {t("workspace_settings.settings.groups.fields.name")}
              <input
                className="rounded-md border border-subtle bg-surface-0 px-3 py-2 text-body-sm-regular outline-none focus:border-custom-primary-100"
                value={formData.name}
                onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
                placeholder={t("workspace_settings.settings.groups.name_placeholder")}
              />
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[7rem_7rem_1fr]">
              <label className="grid gap-1.5 text-body-sm-medium">
                {t("workspace_settings.settings.groups.fields.color")}
                <input
                  type="color"
                  className="h-10 w-full rounded-md border border-subtle bg-surface-0 p-1"
                  value={formData.color}
                  onChange={(event) => setFormData((current) => ({ ...current, color: event.target.value }))}
                />
              </label>
              <div className="grid gap-1.5 text-body-sm-medium">
                <span className="flex items-center justify-between gap-2">
                  {t("workspace_settings.settings.groups.fields.emoji")}
                  {formData.emoji && (
                    <button
                      type="button"
                      className="rounded px-1 text-body-xs-regular text-secondary hover:bg-surface-2"
                      onClick={() => setFormData((current) => ({ ...current, emoji: "" }))}
                    >
                      {t("clear")}
                    </button>
                  )}
                </span>
                <EmojiPicker
                  iconType="material"
                  showIconPicker={false}
                  isOpen={isEmojiPickerOpen}
                  handleToggle={setIsEmojiPickerOpen}
                  buttonClassName="h-10 rounded-md border border-subtle bg-surface-0 px-3 text-lg hover:bg-surface-2"
                  label={
                    <span className="flex items-center justify-center">
                      {formData.emoji ? (
                        getGroupEmoji(formData.emoji)
                      ) : (
                        <SmilePlus className="size-4 text-secondary" />
                      )}
                    </span>
                  }
                  onChange={(value) => {
                    if (value.type !== EmojiIconPickerTypes.EMOJI) return;
                    setFormData((current) => ({ ...current, emoji: value.value }));
                    setIsEmojiPickerOpen(false);
                  }}
                  defaultOpen={EmojiIconPickerTypes.EMOJI}
                />
              </div>
              <label className="grid gap-1.5 text-body-sm-medium">
                {t("workspace_settings.settings.groups.fields.description")}
                <input
                  className="rounded-md border border-subtle bg-surface-0 px-3 py-2 text-body-sm-regular outline-none focus:border-custom-primary-100"
                  value={formData.description}
                  onChange={(event) => setFormData((current) => ({ ...current, description: event.target.value }))}
                  placeholder={t("workspace_settings.settings.groups.description_placeholder")}
                />
              </label>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-end gap-2">
            <Button variant="neutral-primary" size="lg" onClick={resetForm} disabled={isSubmitting}>
              {t("cancel")}
            </Button>
            <Button variant="primary" size="lg" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? `${t("workspace_settings.settings.groups.saving")}...` : t("save")}
            </Button>
          </div>
        </div>
      )}

      <div className="mt-6">
        {workspaceGroups && workspaceGroups.length > 0 ? (
          <div className="divide-y divide-subtle rounded-md border border-subtle bg-surface-1">
            {workspaceGroups.map((group) => {
              const groupMembers = getGroupMembers(group.id);
              const assignedWorkspaceMemberIds = new Set(groupMembers.map((member) => member.workspace_member.id));
              const availableMembers = workspaceMemberIds
                .map((userId) => workspaceMemberStore.getWorkspaceMemberDetails(userId))
                .filter((member): member is IWorkspaceMember => !!member && !assignedWorkspaceMemberIds.has(member.id));

              return (
                <div key={group.id} className="grid gap-4 px-4 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      {group.emoji ? (
                        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded bg-surface-2 text-base">
                          {getGroupEmoji(group.emoji)}
                        </span>
                      ) : (
                        <span
                          className="mt-1 size-3 shrink-0 rounded-full"
                          style={{ backgroundColor: group.color || DEFAULT_FORM.color }}
                        />
                      )}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="truncate text-body-sm-medium text-primary">{group.name}</div>
                          <span className="rounded bg-surface-2 px-2 py-0.5 text-body-xs-regular text-secondary">
                            {t("workspace_settings.settings.groups.members_count", {
                              count: group.member_count ?? groupMembers.length,
                            })}
                          </span>
                        </div>
                        {group.description && (
                          <div className="mt-1 truncate text-body-xs-regular text-secondary">{group.description}</div>
                        )}
                      </div>
                    </div>
                    {canManageGroups && (
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          className="rounded p-1.5 text-secondary hover:bg-surface-2"
                          onClick={() => openEditForm(group)}
                          aria-label={t("workspace_settings.settings.groups.edit_group")}
                          title={t("workspace_settings.settings.groups.edit_group")}
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          type="button"
                          className="rounded p-1.5 text-secondary hover:bg-surface-2"
                          onClick={() => handleArchive(group.id)}
                          title={t("workspace_settings.settings.groups.archive_group")}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="grid gap-3 pl-6">
                    {groupMembers.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {groupMembers.map((groupMember) => {
                          const member = groupMember.workspace_member;
                          return (
                            <div
                              key={groupMember.id}
                              className="flex max-w-full items-center gap-2 rounded border border-subtle bg-surface-0 px-2 py-1"
                            >
                              <Avatar name={getMemberName(member)} src={member.member?.avatar_url || ""} size="sm" />
                              <span className="max-w-44 truncate text-body-xs-regular text-primary">
                                {getMemberName(member)}
                              </span>
                              {canManageGroups && (
                                <button
                                  type="button"
                                  className="rounded p-0.5 text-secondary hover:bg-surface-2"
                                  onClick={() => handleRemoveMember(group, groupMember)}
                                  title={t("workspace_settings.settings.groups.remove_member")}
                                >
                                  <X className="size-3.5" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-body-xs-regular text-secondary">
                        {t("workspace_settings.settings.groups.no_members")}
                      </div>
                    )}

                    {canManageGroups && (
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          className="min-w-52 rounded-md border border-subtle bg-surface-0 px-3 py-2 text-body-sm-regular outline-none focus:border-custom-primary-100"
                          value={selectedMemberIds[group.id] || ""}
                          onChange={(event) =>
                            setSelectedMemberIds((current) => ({ ...current, [group.id]: event.target.value }))
                          }
                        >
                          <option value="">{t("workspace_settings.settings.groups.select_member")}</option>
                          {availableMembers.map((member) => (
                            <option key={member.id} value={member.id}>
                              {getMemberName(member)}
                            </option>
                          ))}
                        </select>
                        <Button
                          variant="neutral-primary"
                          size="lg"
                          onClick={() => handleAddMember(group)}
                          disabled={!selectedMemberIds[group.id] || availableMembers.length === 0}
                        >
                          {t("workspace_settings.settings.groups.add_member")}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyStateCompact
            assetKey="members"
            assetClassName="size-20"
            title={t("workspace_settings.settings.groups.empty_title")}
            description={t("workspace_settings.settings.groups.empty_state")}
            actions={
              canManageGroups
                ? [
                    {
                      label: t("workspace_settings.settings.groups.add_group"),
                      onClick: openCreateForm,
                    },
                  ]
                : undefined
            }
            align="start"
            rootClassName="py-20"
          />
        )}
      </div>
    </SettingsContentWrapper>
  );
});

export default WorkspaceGroupsSettingsPage;
