/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { API_BASE_URL } from "@plane/constants";
import type { IWorkspaceGroup, IWorkspaceGroupMember } from "@plane/types";
// services
import { APIService } from "@/services/api.service";

export class WorkspaceGroupService extends APIService {
  constructor() {
    super(API_BASE_URL);
  }

  async listWorkspaceGroups(workspaceSlug: string): Promise<IWorkspaceGroup[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/groups/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async createWorkspaceGroup(workspaceSlug: string, data: Partial<IWorkspaceGroup>): Promise<IWorkspaceGroup> {
    return this.post(`/api/workspaces/${workspaceSlug}/groups/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async updateWorkspaceGroup(
    workspaceSlug: string,
    groupId: string,
    data: Partial<IWorkspaceGroup>
  ): Promise<IWorkspaceGroup> {
    return this.patch(`/api/workspaces/${workspaceSlug}/groups/${groupId}/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async deleteWorkspaceGroup(workspaceSlug: string, groupId: string): Promise<void> {
    return this.delete(`/api/workspaces/${workspaceSlug}/groups/${groupId}/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async listWorkspaceGroupMembers(workspaceSlug: string, groupId: string): Promise<IWorkspaceGroupMember[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/groups/${groupId}/members/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async addWorkspaceGroupMember(
    workspaceSlug: string,
    groupId: string,
    workspaceMemberId: string
  ): Promise<IWorkspaceGroupMember> {
    return this.post(`/api/workspaces/${workspaceSlug}/groups/${groupId}/members/`, {
      workspace_member_id: workspaceMemberId,
    })
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async deleteWorkspaceGroupMember(workspaceSlug: string, groupId: string, groupMemberId: string): Promise<void> {
    return this.delete(`/api/workspaces/${workspaceSlug}/groups/${groupId}/members/${groupMemberId}/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }
}
