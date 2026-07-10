/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

// Member property constants - Single source of truth for member spreadsheet properties

export type TMemberOrderByOptions =
  | "display_name"
  | "-display_name"
  | "full_name"
  | "-full_name"
  | "email"
  | "-email"
  | "joining_date"
  | "-joining_date"
  | "role"
  | "-role";

export interface IProjectMemberDisplayProperties {
  full_name: boolean;
  display_name: boolean;
  email: boolean;
  joining_date: boolean;
  role: boolean;
}

export const MEMBER_PROPERTY_DETAILS: {
  [key in keyof IProjectMemberDisplayProperties]: {
    i18n_title: string;
    ascendingOrderKey: TMemberOrderByOptions;
    ascendingOrderI18nKey: string;
    descendingOrderKey: TMemberOrderByOptions;
    descendingOrderI18nKey: string;
    iconName: string;
    isSortingAllowed: boolean;
  };
} = {
  full_name: {
    i18n_title: "project_members.full_name",
    ascendingOrderKey: "full_name",
    ascendingOrderI18nKey: "common.sort.a_to_z",
    descendingOrderKey: "-full_name",
    descendingOrderI18nKey: "common.sort.z_to_a",
    iconName: "User",
    isSortingAllowed: true,
  },
  display_name: {
    i18n_title: "project_members.display_name",
    ascendingOrderKey: "display_name",
    ascendingOrderI18nKey: "common.sort.a_to_z",
    descendingOrderKey: "-display_name",
    descendingOrderI18nKey: "common.sort.z_to_a",
    iconName: "User",
    isSortingAllowed: true,
  },
  email: {
    i18n_title: "project_members.email",
    ascendingOrderKey: "email",
    ascendingOrderI18nKey: "common.sort.a_to_z",
    descendingOrderKey: "-email",
    descendingOrderI18nKey: "common.sort.z_to_a",
    iconName: "Mail",
    isSortingAllowed: true,
  },
  joining_date: {
    i18n_title: "project_members.joining_date",
    ascendingOrderKey: "joining_date",
    ascendingOrderI18nKey: "common.sort.old_to_new",
    descendingOrderKey: "-joining_date",
    descendingOrderI18nKey: "common.sort.new_to_old",
    iconName: "Calendar",
    isSortingAllowed: true,
  },
  role: {
    i18n_title: "project_members.role",
    ascendingOrderKey: "role",
    ascendingOrderI18nKey: "common.sort.guest_to_admin",
    descendingOrderKey: "-role",
    descendingOrderI18nKey: "common.sort.admin_to_guest",
    iconName: "Shield",
    isSortingAllowed: true,
  },
};
