/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { translate } from "@plane/i18n";

const LOCALIZABLE_ERROR_FIELDS = new Set(["detail", "error", "message"]);

const API_ERROR_TRANSLATION_KEYS: Record<string, string> = {
  "Access cannot be updated since this page is owned by someone else": "api_errors.page_access_owner_only",
  "An internal error has occurred.": "api_errors.internal_error",
  "Archived module cannot be updated": "api_errors.archived_module_cannot_be_updated",
  "Archived projects cannot be updated": "api_errors.archived_projects_cannot_be_updated",
  "Archived cycle cannot be updated": "api_errors.archived_cycle_cannot_be_updated",
  "At least one member is required": "api_errors.at_least_one_member_required",
  "Asset key does not exist": "api_errors.asset_key_does_not_exist",
  "Asset not found": "api_errors.asset_not_found",
  "Both name and slug are required": "api_errors.workspace_name_and_slug_required",
  "Both start date and end date are either required or are to be null": "api_errors.cycle_dates_required_or_null",
  "Can only archive completed or cancelled state group issue": "api_errors.can_only_archive_completed_or_cancelled",
  "Cycle has no start or end date": "api_errors.cycle_has_no_start_or_end_date",
  "Cycle not found": "api_errors.cycle_not_found",
  "Date is required": "api_errors.date_required",
  "Default state cannot be deleted": "api_errors.default_state_cannot_be_deleted",
  "Each filter node must be a JSON object": "api_errors.filter_node_object_required",
  "Estimate points are required": "api_errors.estimate_points_required",
  "Favorite already exists": "api_errors.favorite_already_exists",
  "Filter objects must not be empty": "api_errors.filter_objects_not_empty",
  "Forbidden": "api_errors.forbidden",
  "Group by and sub group by cannot have same parameters": "api_errors.group_by_duplicate",
  "Intake not found": "api_errors.intake_not_found",
  "Invalid entity type.": "api_errors.invalid_entity_type",
  "Invalid entity type or entity id": "api_errors.invalid_entity_type_or_id",
  "Invalid file type.": "api_errors.invalid_file_type",
  "Invalid file type. Only JPEG, PNG, WebP, JPG and GIF files are allowed.": "api_errors.invalid_image_file_type",
  "Invalid filter parameters": "api_errors.invalid_filter_parameters",
  "Invalid issue identifier": "api_errors.invalid_issue_identifier",
  "Invalid pipeline item date": "api_errors.invalid_pipeline_item_date",
  "Invalid pipeline item status": "api_errors.invalid_pipeline_item_status",
  "Invalid pipeline item target time": "api_errors.invalid_pipeline_item_target_time",
  "Invalid priority": "api_errors.invalid_priority",
  "Invalid tab": "api_errors.invalid_tab",
  "Invalid type": "api_errors.invalid_type",
  "Issue IDs are required": "api_errors.issue_ids_required",
  "Issue attachment not found.": "api_errors.issue_attachment_not_found",
  "Issue relation type is required": "api_errors.issue_relation_type_required",
  "Issue not found": "api_errors.issue_not_found",
  "Issues are required": "api_errors.issues_required",
  "Issues updated successfully": "api_errors.issues_updated_successfully",
  "Key and value are required": "api_errors.key_and_value_required",
  "Label with the same name already exists in the project": "api_errors.label_name_exists",
  "LLM provider API key and model are required": "api_errors.llm_provider_required",
  "Leaf filter must be a non-empty JSON object": "api_errors.leaf_filter_required",
  "Logical operators cannot appear in a leaf filter object": "api_errors.logical_operator_in_leaf",
  "Module not found": "api_errors.module_not_found",
  "Name cannot contain a URL": "api_errors.workspace_name_cannot_contain_url",
  "Name is required": "api_errors.name_required",
  "New Cycle Id is required": "api_errors.new_cycle_id_required",
  "No asset ids provided.": "api_errors.no_asset_ids_provided",
  "Only admin or creator can update the intake work items": "api_errors.intake_update_admin_or_creator",
  "Only admin or owner can delete the page": "api_errors.page_delete_admin_or_owner",
  "Only admin or owner can delete the view": "api_errors.view_delete_admin_or_owner",
  "Only completed or cancelled modules can be archived": "api_errors.only_completed_or_cancelled_modules_archived",
  "Only completed cycles can be archived": "api_errors.only_completed_cycles_can_be_archived",
  "Only the active pipeline step can be completed": "api_errors.only_active_pipeline_step",
  "Only the owner of the view can update the view": "api_errors.view_update_owner_only",
  "Only the owner or admin can archive the page": "api_errors.page_archive_owner_or_admin",
  "Only the owner or admin can un archive the page": "api_errors.page_unarchive_owner_or_admin",
  "Page not found.": "api_errors.page_not_found",
  "Page not found": "api_errors.page_not_found",
  "Page is locked": "api_errors.page_locked",
  "Permission denied": "api_errors.permission_denied",
  "Pipeline item does not belong to this issue": "api_errors.pipeline_item_wrong_issue",
  "Pipeline can only be initialized on a parent issue": "api_errors.pipeline_parent_only",
  "Pipeline item not found": "api_errors.pipeline_item_not_found",
  "Please provide valid detail": "api_errors.provide_valid_detail",
  "Preference not found": "api_errors.preference_not_found",
  "Project does not exist": "api_errors.project_not_found",
  "Project has no pipeline states": "api_errors.project_has_no_pipeline_states",
  "Project is required to create an issue.": "api_errors.project_required_to_create_issue",
  "Project member not found": "api_errors.project_member_not_found",
  "Project not found": "api_errors.project_not_found",
  "Quick link not found.": "api_errors.quick_link_not_found",
  "Reaction already exists for the user": "api_errors.reaction_already_exists",
  "REQUEST_BODY_TOO_LARGE": "api_errors.request_body_too_large",
  "Something went wrong please try again later": "api_errors.something_went_wrong_try_later",
  "Source cycle not found": "api_errors.source_cycle_not_found",
  "Start date and end date both are required": "api_errors.start_and_end_dates_required",
  "Start date cannot exceed target date": "api_errors.start_date_after_target",
  "Success": "api_errors.success",
  "Successful": "api_errors.success",
  "Successfully updated": "api_errors.successfully_updated",
  "Sub Issue IDs are required": "api_errors.sub_issue_ids_required",
  "The page should be archived before deleting": "api_errors.page_archive_before_delete",
  "The size of the request body exceeds the maximum allowed size.": "api_errors.request_body_too_large_detail",
  "The state is not empty, only empty states can be deleted": "api_errors.state_not_empty",
  "Task is required": "api_errors.task_required",
  "The Cycle has already been completed so it cannot be edited": "api_errors.completed_cycle_cannot_be_edited",
  "The Cycle has already been completed so no new issues can be added": "api_errors.completed_cycle_cannot_add_issues",
  "The asset is not uploaded.": "api_errors.asset_not_uploaded",
  "The cycle where the issues are transferred is already completed": "api_errors.transfer_cycle_completed",
  "The maximum length for name is 80 and for slug is 48": "api_errors.workspace_name_slug_max_length",
  "The payload is not valid": "api_errors.payload_not_valid",
  "The requested asset could not be found.": "api_errors.asset_not_found",
  "The required key does not exist.": "api_errors.required_key_missing",
  "The required object does not exist.": "api_errors.required_object_missing",
  "Triage state not found": "api_errors.triage_state_not_found",
  "Updated successfully": "api_errors.successfully_updated",
  "URL already exists for the workspace": "api_errors.webhook_url_exists",
  "User already subscribed to the issue.": "api_errors.user_already_subscribed",
  "User is a part of some projects where they are the only admin, they should either leave that project or promote another user to admin.":
    "api_errors.user_only_admin_in_some_projects",
  "Workspace Slug is required": "api_errors.workspace_slug_required",
  "Workspace creation is not allowed": "api_errors.workspace_creation_not_allowed",
  "Workspace member not found": "api_errors.workspace_member_not_found",
  "You are a part of some projects where you are the only admin, you should either leave the project or promote another user to admin.":
    "api_errors.you_only_admin_in_some_projects",
  "You are not a member of this project": "api_errors.not_project_member",
  "You are not allowed to comment on the issue": "api_errors.comment_not_allowed",
  "You are not allowed to view this issue": "api_errors.view_issue_not_allowed",
  "You are not allowed to view this page": "api_errors.view_page_not_allowed",
  "You cannot add a user with role higher than the workspace role": "api_errors.cannot_add_higher_workspace_role",
  "You cannot add a user with role lower than the workspace role": "api_errors.cannot_add_lower_workspace_role",
  "You cannot assign a role equal to or higher than your own": "api_errors.cannot_assign_equal_or_higher_role",
  "You cannot delete the default intake": "api_errors.cannot_delete_default_intake",
  "You cannot edit intake issues": "api_errors.cannot_edit_intake_issues",
  "You cannot leave the project as your the only admin of the project you will have to either delete the project or create an another admin":
    "api_errors.cannot_leave_project_only_admin",
  "You cannot leave the workspace as you are the only admin of the workspace you will have to either delete the workspace or promote another user to admin.":
    "api_errors.cannot_leave_workspace_only_admin",
  "You cannot remove a user having role higher than you": "api_errors.cannot_remove_higher_role_user",
  "You cannot remove yourself from the workspace. Please use leave workspace": "api_errors.cannot_remove_yourself",
  "You cannot update the role of a member with a role equal to or higher than your own":
    "api_errors.cannot_update_equal_or_higher_role",
  "You cannot update your own role": "api_errors.cannot_update_own_role",
  "You do not have permission": "api_errors.permission_denied",
  "You do not have permission to update roles": "api_errors.update_roles_permission_denied",
  "You don't have the required permissions.": "api_errors.required_permissions_missing",
  "You have a cycle already on the given dates, if you want to create a draft cycle you can do that by removing dates":
    "api_errors.cycle_date_conflict",
  "Cannot delete an identifier of an existing project": "api_errors.cannot_delete_existing_project_identifier",
  "per_page and cursor are required": "api_errors.pagination_required",
};

const API_ERROR_PREFIX_TRANSLATION_KEYS: Array<[string, string]> = [
  ["All children of '", "api_errors.filter_children_objects_required"],
  ["Filtering on field '", "api_errors.filtering_field_not_allowed"],
  ["List value for '", "api_errors.filter_list_value_invalid"],
];

const localizeAPIErrorText = (value: string) => {
  const translationKey = API_ERROR_TRANSLATION_KEYS[value];
  const prefixTranslationKey = API_ERROR_PREFIX_TRANSLATION_KEYS.find(([prefix]) => value.startsWith(prefix))?.[1];
  const resolvedTranslationKey = translationKey ?? prefixTranslationKey;
  if (!resolvedTranslationKey) return value;

  const translated = translate(resolvedTranslationKey);
  return translated === resolvedTranslationKey ? value : translated;
};

export const localizeAPIErrorPayload = (payload: unknown): unknown => {
  if (!payload || typeof payload !== "object") return payload;

  if (Array.isArray(payload)) return payload.map(localizeAPIErrorPayload);

  Object.entries(payload as Record<string, unknown>).forEach(([key, value]) => {
    if (LOCALIZABLE_ERROR_FIELDS.has(key) && typeof value === "string") {
      (payload as Record<string, unknown>)[key] = localizeAPIErrorText(value);
      return;
    }

    if (value && typeof value === "object") localizeAPIErrorPayload(value);
  });

  return payload;
};
