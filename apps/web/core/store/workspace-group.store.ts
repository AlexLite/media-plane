/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { set, sortBy } from "lodash-es";
import { action, computed, makeObservable, observable, runInAction } from "mobx";
import { computedFn } from "mobx-utils";
// types
import type { IWorkspaceGroup, IWorkspaceGroupMember } from "@plane/types";
// services
import { WorkspaceGroupService } from "@/services/workspace-group.service";
// store
import type { CoreRootStore } from "./root.store";

export interface IWorkspaceGroupStore {
  fetchedMap: Record<string, boolean>;
  groupMap: Record<string, IWorkspaceGroup>;
  groupMemberMap: Record<string, IWorkspaceGroupMember[]>;
  workspaceGroups: IWorkspaceGroup[] | undefined;
  getWorkspaceGroups: (workspaceSlug: string) => IWorkspaceGroup[] | undefined;
  getGroupById: (groupId: string) => IWorkspaceGroup | null;
  getGroupMembers: (groupId: string) => IWorkspaceGroupMember[];
  fetchWorkspaceGroups: (workspaceSlug: string) => Promise<IWorkspaceGroup[]>;
  createWorkspaceGroup: (workspaceSlug: string, data: Partial<IWorkspaceGroup>) => Promise<IWorkspaceGroup>;
  updateWorkspaceGroup: (
    workspaceSlug: string,
    groupId: string,
    data: Partial<IWorkspaceGroup>
  ) => Promise<IWorkspaceGroup>;
  deleteWorkspaceGroup: (workspaceSlug: string, groupId: string) => Promise<void>;
  fetchWorkspaceGroupMembers: (workspaceSlug: string, groupId: string) => Promise<IWorkspaceGroupMember[]>;
  addWorkspaceGroupMember: (
    workspaceSlug: string,
    groupId: string,
    workspaceMemberId: string
  ) => Promise<IWorkspaceGroupMember>;
  deleteWorkspaceGroupMember: (workspaceSlug: string, groupId: string, groupMemberId: string) => Promise<void>;
}

export class WorkspaceGroupStore implements IWorkspaceGroupStore {
  rootStore;
  groupMap: Record<string, IWorkspaceGroup> = {};
  groupMemberMap: Record<string, IWorkspaceGroupMember[]> = {};
  fetchedMap: Record<string, boolean> = {};
  workspaceGroupService;

  constructor(_rootStore: CoreRootStore) {
    makeObservable(this, {
      groupMap: observable,
      groupMemberMap: observable,
      fetchedMap: observable,
      workspaceGroups: computed,
      fetchWorkspaceGroups: action,
      createWorkspaceGroup: action,
      updateWorkspaceGroup: action,
      deleteWorkspaceGroup: action,
      fetchWorkspaceGroupMembers: action,
      addWorkspaceGroupMember: action,
      deleteWorkspaceGroupMember: action,
    });

    this.rootStore = _rootStore;
    this.workspaceGroupService = new WorkspaceGroupService();
  }

  get workspaceGroups() {
    const currentWorkspaceDetails = this.rootStore.workspaceRoot.currentWorkspace;
    if (!currentWorkspaceDetails) return;
    return this.getWorkspaceGroups(currentWorkspaceDetails.slug);
  }

  getWorkspaceGroups = computedFn((workspaceSlug: string) => {
    const workspaceDetails = this.rootStore.workspaceRoot.getWorkspaceBySlug(workspaceSlug);
    if (!workspaceDetails || !this.fetchedMap[workspaceSlug]) return;
    return sortBy(
      Object.values(this.groupMap).filter((group) => group.workspace_id === workspaceDetails.id && !group.is_archived),
      ["sort_order", "name"]
    );
  });

  getGroupById = computedFn((groupId: string): IWorkspaceGroup | null => this.groupMap?.[groupId] || null);

  getGroupMembers = computedFn((groupId: string): IWorkspaceGroupMember[] => this.groupMemberMap[groupId] || []);

  fetchWorkspaceGroups = async (workspaceSlug: string) =>
    await this.workspaceGroupService.listWorkspaceGroups(workspaceSlug).then((response) => {
      runInAction(() => {
        response.forEach((group) => set(this.groupMap, [group.id], group));
        set(this.fetchedMap, workspaceSlug, true);
      });
      return response;
    });

  createWorkspaceGroup = async (workspaceSlug: string, data: Partial<IWorkspaceGroup>) =>
    await this.workspaceGroupService.createWorkspaceGroup(workspaceSlug, data).then((response) => {
      runInAction(() => set(this.groupMap, [response.id], response));
      return response;
    });

  updateWorkspaceGroup = async (workspaceSlug: string, groupId: string, data: Partial<IWorkspaceGroup>) => {
    const originalGroup = this.groupMap[groupId];
    try {
      runInAction(() => set(this.groupMap, [groupId], { ...originalGroup, ...data }));
      const response = await this.workspaceGroupService.updateWorkspaceGroup(workspaceSlug, groupId, data);
      runInAction(() => set(this.groupMap, [groupId], response));
      return response;
    } catch (error) {
      runInAction(() => set(this.groupMap, [groupId], originalGroup));
      throw error;
    }
  };

  deleteWorkspaceGroup = async (workspaceSlug: string, groupId: string) => {
    if (!this.groupMap[groupId]) return;
    await this.workspaceGroupService.deleteWorkspaceGroup(workspaceSlug, groupId).then(() => {
      runInAction(() => set(this.groupMap, [groupId], { ...this.groupMap[groupId], is_archived: true }));
    });
  };

  fetchWorkspaceGroupMembers = async (workspaceSlug: string, groupId: string) =>
    await this.workspaceGroupService.listWorkspaceGroupMembers(workspaceSlug, groupId).then((response) => {
      runInAction(() => {
        set(this.groupMemberMap, [groupId], response);
        set(this.groupMap, [groupId, "member_count"], response.length);
      });
      return response;
    });

  addWorkspaceGroupMember = async (workspaceSlug: string, groupId: string, workspaceMemberId: string) =>
    await this.workspaceGroupService.addWorkspaceGroupMember(workspaceSlug, groupId, workspaceMemberId).then((response) => {
      runInAction(() => {
        const nextMembers = [...(this.groupMemberMap[groupId] || []), response];
        set(this.groupMemberMap, [groupId], nextMembers);
        set(this.groupMap, [groupId, "member_count"], nextMembers.length);
      });
      return response;
    });

  deleteWorkspaceGroupMember = async (workspaceSlug: string, groupId: string, groupMemberId: string) =>
    await this.workspaceGroupService.deleteWorkspaceGroupMember(workspaceSlug, groupId, groupMemberId).then(() => {
      runInAction(() => {
        const nextMembers = (this.groupMemberMap[groupId] || []).filter((member) => member.id !== groupMemberId);
        set(this.groupMemberMap, [groupId], nextMembers);
        set(this.groupMap, [groupId, "member_count"], nextMembers.length);
      });
    });
}
