/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect, useRef, useState } from "react";
import { Popover } from "@headlessui/react";
import { observer } from "mobx-react";
import { Bell, Pencil, Search, SmilePlus, Trash2, UserPlus, Users, X } from "lucide-react";
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
import { useProject } from "@/hooks/store/use-project";
import { useProjectState } from "@/hooks/store/use-project-state";
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
    getGroupNotificationRules,
    fetchWorkspaceGroupNotificationRules,
    updateWorkspaceGroupNotificationRules,
  } = useWorkspaceGroup();
  const { workspace: workspaceMemberStore } = useMember();
  const { workspaceProjectIds, getProjectById, fetchProjects } = useProject();
  const projectStateStore = useProjectState();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [formData, setFormData] = useState<GroupFormData>(DEFAULT_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [managingGroupId, setManagingGroupId] = useState<string | null>(null);
  const [notificationGroupId, setNotificationGroupId] = useState<string | null>(null);
  const [selectedNotificationProjectId, setSelectedNotificationProjectId] = useState<string | null>(null);
  const [selectedNotificationStateIds, setSelectedNotificationStateIds] = useState<string[]>([]);
  const [isNotificationSaving, setIsNotificationSaving] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
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
  useSWR(canViewGroups ? `WORKSPACE_GROUP_PROJECTS_${workspaceSlug}` : null, () => fetchProjects(workspaceSlug));
  useSWR(canViewGroups && workspaceGroups ? `WORKSPACE_GROUP_MEMBERS_${workspaceSlug}` : null, async () => {
    await Promise.all(workspaceGroups?.map((group) => fetchWorkspaceGroupMembers(workspaceSlug, group.id)) || []);
  });
  useSWR(
    canViewGroups && selectedNotificationProjectId
      ? `WORKSPACE_GROUP_NOTIFICATION_STATES_${workspaceSlug}_${selectedNotificationProjectId}`
      : null,
    () => projectStateStore.fetchProjectStates(workspaceSlug, selectedNotificationProjectId || "")
  );

  const projects = (workspaceProjectIds || [])
    .map((projectId) => getProjectById(projectId))
    .filter((project): project is NonNullable<ReturnType<typeof getProjectById>> => !!project && !project.archived_at);
  const notificationRules = notificationGroupId ? getGroupNotificationRules(notificationGroupId) : [];
  const notificationRulesKey = notificationRules
    .map((rule) => `${rule.project_id}:${rule.state_id}`)
    .sort()
    .join(",");
  const selectedProjectStates = selectedNotificationProjectId
    ? projectStateStore.getProjectStates(selectedNotificationProjectId) || []
    : [];

  useEffect(() => {
    if (!notificationGroupId || selectedNotificationProjectId || projects.length === 0) return;
    setSelectedNotificationProjectId(projects[0]?.id || null);
  }, [notificationGroupId, selectedNotificationProjectId, projects]);

  useEffect(() => {
    if (!notificationGroupId || !selectedNotificationProjectId) {
      setSelectedNotificationStateIds([]);
      return;
    }

    setSelectedNotificationStateIds(
      notificationRules.filter((rule) => rule.project_id === selectedNotificationProjectId).map((rule) => rule.state_id)
    );
  }, [notificationGroupId, selectedNotificationProjectId, notificationRulesKey]);

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

  const getAvailableMembers = (group: IWorkspaceGroup) => {
    const assignedWorkspaceMemberIds = new Set(getGroupMembers(group.id).map((member) => member.workspace_member.id));

    return workspaceMemberIds
      .map((userId) => workspaceMemberStore.getWorkspaceMemberDetails(userId))
      .filter((member): member is IWorkspaceMember => !!member && !assignedWorkspaceMemberIds.has(member.id));
  };

  const openMembersPanel = async (group: IWorkspaceGroup) => {
    setManagingGroupId(group.id);
    setMemberSearchQuery("");
    await fetchWorkspaceGroupMembers(workspaceSlug, group.id);
  };

  const openNotificationPanel = async (group: IWorkspaceGroup) => {
    setNotificationGroupId(group.id);
    if (!selectedNotificationProjectId && projects.length > 0)
      setSelectedNotificationProjectId(projects[0]?.id || null);
    await fetchWorkspaceGroupNotificationRules(workspaceSlug, group.id);
  };

  const toggleNotificationState = (stateId: string) => {
    setSelectedNotificationStateIds((current) =>
      current.includes(stateId) ? current.filter((id) => id !== stateId) : [...current, stateId]
    );
  };

  const saveNotificationRules = async (group: IWorkspaceGroup) => {
    if (!selectedNotificationProjectId) return;

    setIsNotificationSaving(true);
    try {
      await updateWorkspaceGroupNotificationRules(workspaceSlug, group.id, {
        project_id: selectedNotificationProjectId,
        state_ids: selectedNotificationStateIds,
      });
      setToast({
        type: TOAST_TYPE.SUCCESS,
        title: t("common.success"),
        message: t("workspace_settings.settings.groups.toasts.notification_rules_updated"),
      });
    } catch (error: any) {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: t("common.error.label"),
        message: error?.error || t("something_went_wrong_please_try_again"),
      });
    } finally {
      setIsNotificationSaving(false);
    }
  };

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

  const handleAddMember = async (group: IWorkspaceGroup, workspaceMemberId: string) => {
    if (!workspaceMemberId) return;

    try {
      await addWorkspaceGroupMember(workspaceSlug, group.id, workspaceMemberId);
      setToast({
        type: TOAST_TYPE.SUCCESS,
        title: t("common.success"),
        message: t("workspace_settings.settings.groups.toasts.member_added"),
      });
    } catch (error: any) {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: t("common.error.label"),
        message: error?.workspace_member_id?.[0] || error?.error || t("something_went_wrong_please_try_again"),
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
                className="bg-surface-0 focus:border-custom-primary-100 rounded-md border border-subtle px-3 py-2 text-body-sm-regular outline-none"
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
                  className="bg-surface-0 h-10 w-full rounded-md border border-subtle p-1"
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
                      {formData.emoji ? getGroupEmoji(formData.emoji) : <SmilePlus className="size-4 text-secondary" />}
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
                  className="bg-surface-0 focus:border-custom-primary-100 rounded-md border border-subtle px-3 py-2 text-body-sm-regular outline-none"
                  value={formData.description}
                  onChange={(event) => setFormData((current) => ({ ...current, description: event.target.value }))}
                  placeholder={t("workspace_settings.settings.groups.description_placeholder")}
                />
              </label>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-end gap-2">
            <Button variant="secondary" size="lg" onClick={resetForm} disabled={isSubmitting}>
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

              return (
                <div key={group.id} className="grid gap-4 px-4 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      {group.emoji ? (
                        <span className="text-base mt-0.5 flex size-7 shrink-0 items-center justify-center rounded bg-surface-2">
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
                        <Popover className="relative">
                          {({ close, open }) => (
                            <>
                              <Popover.Button
                                type="button"
                                className={`rounded p-1.5 text-secondary hover:bg-surface-2 ${
                                  open ? "bg-surface-2" : ""
                                }`}
                                onClick={() => openMembersPanel(group)}
                                aria-label={t("workspace_settings.settings.groups.manage_members")}
                                title={t("workspace_settings.settings.groups.manage_members")}
                              >
                                <Users className="size-4" />
                              </Popover.Button>
                              <Popover.Panel className="absolute top-full right-0 isolate z-[100] mt-2 w-[28rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-md border border-strong bg-layer-2 shadow-raised-200">
                                <div className="border-b border-subtle px-3 py-2.5">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        {group.emoji ? (
                                          <span className="text-base flex size-7 shrink-0 items-center justify-center rounded bg-surface-2">
                                            {getGroupEmoji(group.emoji)}
                                          </span>
                                        ) : (
                                          <span
                                            className="size-3 shrink-0 rounded-full"
                                            style={{ backgroundColor: group.color || DEFAULT_FORM.color }}
                                          />
                                        )}
                                        <div className="truncate text-body-sm-medium text-primary">{group.name}</div>
                                      </div>
                                      <div className="mt-1 text-body-xs-regular text-secondary">
                                        {t("workspace_settings.settings.groups.members_panel_description")}
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      className="rounded p-1 text-secondary hover:bg-surface-2"
                                      onClick={() => {
                                        setManagingGroupId(null);
                                        close();
                                      }}
                                      aria-label={t("close")}
                                      title={t("close")}
                                    >
                                      <X className="size-4" />
                                    </button>
                                  </div>
                                </div>

                                <div className="max-h-[28rem] overflow-y-auto p-3">
                                  <section className="grid gap-2">
                                    <div className="flex items-center justify-between gap-3">
                                      <h6 className="text-body-xs-medium text-primary">
                                        {t("workspace_settings.settings.groups.current_members")}
                                      </h6>
                                      <span className="rounded bg-surface-2 px-2 py-0.5 text-body-xs-regular text-secondary">
                                        {t("workspace_settings.settings.groups.members_count", {
                                          count: group.member_count ?? groupMembers.length,
                                        })}
                                      </span>
                                    </div>

                                    {groupMembers.length > 0 ? (
                                      <div className="grid gap-1.5">
                                        {groupMembers.map((groupMember) => {
                                          const member = groupMember.workspace_member;

                                          return (
                                            <div
                                              key={groupMember.id}
                                              className="flex items-center justify-between gap-3 rounded px-2 py-1.5 hover:bg-surface-1"
                                            >
                                              <div className="flex min-w-0 items-center gap-2">
                                                <Avatar
                                                  name={getMemberName(member)}
                                                  src={member.member?.avatar_url || ""}
                                                  size="sm"
                                                />
                                                <div className="min-w-0">
                                                  <div className="truncate text-body-sm-regular text-primary">
                                                    {getMemberName(member)}
                                                  </div>
                                                  {member.member?.email && (
                                                    <div className="truncate text-body-xs-regular text-secondary">
                                                      {member.member.email}
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                              <button
                                                type="button"
                                                className="rounded p-1 text-secondary hover:bg-surface-2"
                                                onClick={() => handleRemoveMember(group, groupMember)}
                                                aria-label={t("workspace_settings.settings.groups.remove_member")}
                                                title={t("workspace_settings.settings.groups.remove_member")}
                                              >
                                                <X className="size-4" />
                                              </button>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <div className="rounded border border-dashed border-subtle px-3 py-3 text-body-xs-regular text-secondary">
                                        {t("workspace_settings.settings.groups.no_members")}
                                      </div>
                                    )}
                                  </section>

                                  <section className="mt-4 grid gap-2">
                                    <h6 className="text-body-xs-medium text-primary">
                                      {t("workspace_settings.settings.groups.available_members")}
                                    </h6>
                                    <label className="flex items-center gap-2 rounded-md border border-subtle bg-surface-1 px-2 py-1.5">
                                      <Search className="size-4 shrink-0 text-secondary" />
                                      <input
                                        className="min-w-0 flex-1 bg-transparent text-body-sm-regular outline-none"
                                        value={memberSearchQuery}
                                        onChange={(event) => setMemberSearchQuery(event.target.value)}
                                        placeholder={t("workspace_settings.settings.groups.search_members")}
                                      />
                                    </label>

                                    {(() => {
                                      const query = memberSearchQuery.trim().toLowerCase();
                                      const availableMembers = getAvailableMembers(group).filter((member) => {
                                        if (!query) return true;
                                        const name = getMemberName(member).toLowerCase();
                                        const email = member.member?.email?.toLowerCase() || "";

                                        return name.includes(query) || email.includes(query);
                                      });

                                      if (availableMembers.length === 0) {
                                        return (
                                          <div className="rounded border border-dashed border-subtle px-3 py-3 text-body-xs-regular text-secondary">
                                            {query
                                              ? t("workspace_settings.settings.groups.no_search_results")
                                              : t("workspace_settings.settings.groups.no_available_members")}
                                          </div>
                                        );
                                      }

                                      return (
                                        <div className="grid gap-1.5">
                                          {availableMembers.map((member) => (
                                            <div
                                              key={member.id}
                                              className="flex items-center justify-between gap-3 rounded px-2 py-1.5 hover:bg-surface-1"
                                            >
                                              <div className="flex min-w-0 items-center gap-2">
                                                <Avatar
                                                  name={getMemberName(member)}
                                                  src={member.member?.avatar_url || ""}
                                                  size="sm"
                                                />
                                                <div className="min-w-0">
                                                  <div className="truncate text-body-sm-regular text-primary">
                                                    {getMemberName(member)}
                                                  </div>
                                                  {member.member?.email && (
                                                    <div className="truncate text-body-xs-regular text-secondary">
                                                      {member.member.email}
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                              <button
                                                type="button"
                                                className="rounded p-1 text-secondary hover:bg-surface-2"
                                                onClick={() => handleAddMember(group, member.id)}
                                                aria-label={t("workspace_settings.settings.groups.add_member")}
                                                title={t("workspace_settings.settings.groups.add_member")}
                                              >
                                                <UserPlus className="size-4" />
                                              </button>
                                            </div>
                                          ))}
                                        </div>
                                      );
                                    })()}
                                  </section>
                                </div>
                              </Popover.Panel>
                            </>
                          )}
                        </Popover>
                        <Popover className="relative">
                          {({ close, open }) => (
                            <>
                              <Popover.Button
                                type="button"
                                className={`rounded p-1.5 text-secondary hover:bg-surface-2 ${
                                  open ? "bg-surface-2" : ""
                                }`}
                                onClick={() => openNotificationPanel(group)}
                                aria-label={t("workspace_settings.settings.groups.manage_notifications")}
                                title={t("workspace_settings.settings.groups.manage_notifications")}
                              >
                                <Bell className="size-4" />
                              </Popover.Button>
                              <Popover.Panel className="absolute top-full right-0 isolate z-[100] mt-2 w-[32rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-md border border-strong bg-layer-2 shadow-raised-200">
                                <div className="border-b border-subtle px-3 py-2.5">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        {group.emoji ? (
                                          <span className="text-base flex size-7 shrink-0 items-center justify-center rounded bg-surface-2">
                                            {getGroupEmoji(group.emoji)}
                                          </span>
                                        ) : (
                                          <span
                                            className="size-3 shrink-0 rounded-full"
                                            style={{ backgroundColor: group.color || DEFAULT_FORM.color }}
                                          />
                                        )}
                                        <div className="truncate text-body-sm-medium text-primary">
                                          {t("workspace_settings.settings.groups.notifications_title", {
                                            group: group.name,
                                          })}
                                        </div>
                                      </div>
                                      <div className="mt-1 text-body-xs-regular text-secondary">
                                        {t("workspace_settings.settings.groups.notifications_panel_description")}
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      className="rounded p-1 text-secondary hover:bg-surface-2"
                                      onClick={() => {
                                        setNotificationGroupId(null);
                                        close();
                                      }}
                                      aria-label={t("close")}
                                      title={t("close")}
                                    >
                                      <X className="size-4" />
                                    </button>
                                  </div>
                                </div>

                                <div className="grid max-h-[30rem] gap-4 overflow-y-auto p-3">
                                  <label className="grid gap-1.5 text-body-xs-medium text-primary">
                                    {t("workspace_settings.settings.groups.project")}
                                    <select
                                      className="focus:border-custom-primary-100 rounded-md border border-subtle bg-surface-1 px-2 py-2 text-body-sm-regular outline-none"
                                      value={selectedNotificationProjectId || ""}
                                      onChange={(event) => setSelectedNotificationProjectId(event.target.value || null)}
                                    >
                                      {projects.length === 0 && (
                                        <option value="">{t("workspace_settings.settings.groups.no_projects")}</option>
                                      )}
                                      {projects.map((project) => (
                                        <option key={project.id} value={project.id}>
                                          {project.name}
                                        </option>
                                      ))}
                                    </select>
                                  </label>

                                  <section className="grid gap-2">
                                    <div className="flex items-center justify-between gap-3">
                                      <h6 className="text-body-xs-medium text-primary">
                                        {t("workspace_settings.settings.groups.allowed_states")}
                                      </h6>
                                      <span className="rounded bg-surface-2 px-2 py-0.5 text-body-xs-regular text-secondary">
                                        {t("workspace_settings.settings.groups.states_count", {
                                          count: selectedNotificationStateIds.length,
                                        })}
                                      </span>
                                    </div>
                                    <div className="text-body-xs-regular text-secondary">
                                      {t("workspace_settings.settings.groups.allowed_states_description")}
                                    </div>

                                    {selectedProjectStates.length > 0 ? (
                                      <div className="grid gap-1.5">
                                        {selectedProjectStates.map((state) => {
                                          const selected = selectedNotificationStateIds.includes(state.id);

                                          return (
                                            <button
                                              key={state.id}
                                              type="button"
                                              className={`flex items-center justify-between gap-3 rounded border px-2 py-1.5 text-left hover:bg-surface-1 ${
                                                selected
                                                  ? "border-custom-primary-100 bg-custom-primary-100/10"
                                                  : "border-subtle"
                                              }`}
                                              onClick={() => toggleNotificationState(state.id)}
                                            >
                                              <span className="flex min-w-0 items-center gap-2">
                                                <span
                                                  className="size-3 shrink-0 rounded-full"
                                                  style={{ backgroundColor: state.color }}
                                                />
                                                <span className="truncate text-body-sm-regular text-primary">
                                                  {state.name}
                                                </span>
                                              </span>
                                              <input
                                                type="checkbox"
                                                className="size-4 shrink-0"
                                                checked={selected}
                                                onChange={() => toggleNotificationState(state.id)}
                                                onClick={(event) => event.stopPropagation()}
                                              />
                                            </button>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <div className="rounded border border-dashed border-subtle px-3 py-3 text-body-xs-regular text-secondary">
                                        {selectedNotificationProjectId
                                          ? t("workspace_settings.settings.groups.no_states")
                                          : t("workspace_settings.settings.groups.select_project")}
                                      </div>
                                    )}
                                  </section>
                                </div>

                                <div className="flex items-center justify-between gap-3 border-t border-subtle px-3 py-2.5">
                                  <div className="text-body-xs-regular text-secondary">
                                    {selectedNotificationStateIds.length === 0
                                      ? t("workspace_settings.settings.groups.no_rule_hint")
                                      : t("workspace_settings.settings.groups.rule_active_hint")}
                                  </div>
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => saveNotificationRules(group)}
                                    disabled={!selectedNotificationProjectId || isNotificationSaving}
                                  >
                                    {isNotificationSaving
                                      ? `${t("workspace_settings.settings.groups.saving")}...`
                                      : t("save")}
                                  </Button>
                                </div>
                              </Popover.Panel>
                            </>
                          )}
                        </Popover>
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
                              className="bg-surface-0 flex max-w-full items-center gap-2 rounded border border-subtle px-2 py-1"
                            >
                              <Avatar name={getMemberName(member)} src={member.member?.avatar_url || ""} size="sm" />
                              <span className="max-w-44 truncate text-body-xs-regular text-primary">
                                {getMemberName(member)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-body-xs-regular text-secondary">
                        {t("workspace_settings.settings.groups.no_members")}
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
