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
  "Archived cycle cannot be edited": "api_errors.archived_cycle_cannot_be_edited",
  "Archived module cannot be edited": "api_errors.archived_module_cannot_be_edited",
  "Archived project cannot be updated": "api_errors.archived_project_cannot_be_updated",
  "All recipient addresses were refused.": "api_errors.email_recipients_refused",
  "At least one member is required": "api_errors.at_least_one_member_required",
  "Asset key does not exist": "api_errors.asset_key_does_not_exist",
  "Asset not found": "api_errors.asset_not_found",
  "Asset not yet uploaded": "api_errors.asset_not_uploaded",
  "Asset with same external id and source already exists": "api_errors.asset_external_id_exists",
  "Both name and slug are required": "api_errors.workspace_name_and_slug_required",
  "Both start date and end date are either required or are to be null": "api_errors.cycle_dates_required_or_null",
  "Can only archive completed or cancelled state group issue": "api_errors.can_only_archive_completed_or_cancelled",
  "Cannot create triage state": "api_errors.cannot_create_triage_state",
  "Comments are not enabled for this project": "api_errors.comments_not_enabled",
  "Cycle has no start or end date": "api_errors.cycle_has_no_start_or_end_date",
  "Cycle with the same external id and external source already exists": "api_errors.cycle_external_id_exists",
  "Cycle not found": "api_errors.cycle_not_found",
  "Date is required": "api_errors.date_required",
  "Default state cannot be deleted": "api_errors.default_state_cannot_be_deleted",
  "Failed to disable email configuration": "api_errors.email_configuration_disable_failed",
  "Estimate not found": "api_errors.estimate_not_found",
  "Estimate point not found": "api_errors.estimate_point_not_found",
  "Estimate point is not valid please pass a valid estimate_point_id": "api_errors.invalid_estimate_point",
  "Each filter node must be a JSON object": "api_errors.filter_node_object_required",
  "Estimate points are required": "api_errors.estimate_points_required",
  "Favorite already exists": "api_errors.favorite_already_exists",
  "Filter objects must not be empty": "api_errors.filter_objects_not_empty",
  "Forbidden": "api_errors.forbidden",
  "GROUP_MEMBER_ALREADY_EXISTS": "api_errors.group_member_already_exists",
  "GROUP_NAME_ALREADY_EXISTS": "api_errors.group_name_already_exists",
  "Group by and sub group by cannot have same parameters": "api_errors.group_by_duplicate",
  "html content is not valid": "api_errors.html_content_invalid",
  "Intake not found": "api_errors.intake_not_found",
  "Intake is not enabled for this Project Board": "api_errors.intake_not_enabled_project_board",
  "Intake is not enabled for this project enable it through the project": "api_errors.intake_not_enabled_project",
  "Invalid entity type.": "api_errors.invalid_entity_type",
  "Invalid entity type or entity id": "api_errors.invalid_entity_type_or_id",
  "Invalid anchor": "api_errors.invalid_anchor",
  "Invalid file type.": "api_errors.invalid_file_type",
  "Invalid file type. Only JPEG and PNG files are allowed.": "api_errors.invalid_jpeg_png_file_type",
  "Invalid file type. Only JPEG, PNG, WebP, JPG and GIF files are allowed.": "api_errors.invalid_image_file_type",
  "Invalid filter parameters": "api_errors.invalid_filter_parameters",
  "Invalid HTML passed": "api_errors.invalid_html",
  "Invalid issue identifier": "api_errors.invalid_issue_identifier",
  "Invalid request.": "api_errors.invalid_request",
  "Invalid role": "api_errors.invalid_role",
  "Invalid pipeline item date": "api_errors.invalid_pipeline_item_date",
  "Invalid pipeline item status": "api_errors.invalid_pipeline_item_status",
  "Invalid pipeline item target time": "api_errors.invalid_pipeline_item_target_time",
  "Invalid priority": "api_errors.invalid_priority",
  "Invalid tab": "api_errors.invalid_tab",
  "Invalid type": "api_errors.invalid_type",
  "Invalid URL format.": "api_errors.invalid_url_format",
  "Invalid URL scheme.": "api_errors.invalid_url_scheme",
  "Invalid credentials provided": "api_errors.email_credentials_invalid",
  "Issue IDs are required": "api_errors.issue_ids_required",
  "Issue attachment not found.": "api_errors.issue_attachment_not_found",
  "Issue with the same external id and external source already exists": "api_errors.issue_external_id_exists",
  "Issue relation type is required": "api_errors.issue_relation_type_required",
  "Issue not found": "api_errors.issue_not_found",
  "Issues are required": "api_errors.issues_required",
  "Issues updated successfully": "api_errors.issues_updated_successfully",
  "Key and value are required": "api_errors.key_and_value_required",
  "Label with the same external id and external source already exists": "api_errors.label_external_id_exists",
  "Label with the same name already exists in the project": "api_errors.label_name_exists",
  "LLM provider API key and model are required": "api_errors.llm_provider_required",
  "Leaf filter must be a non-empty JSON object": "api_errors.leaf_filter_required",
  "Logical operators cannot appear in a leaf filter object": "api_errors.logical_operator_in_leaf",
  "Module with this name already exists": "api_errors.module_name_exists",
  "Module with the same external id and external source already exists": "api_errors.module_external_id_exists",
  "Module not found": "api_errors.module_not_found",
  "Name cannot contain a URL": "api_errors.workspace_name_cannot_contain_url",
  "Name and size are required fields.": "api_errors.name_size_required",
  "Name is required": "api_errors.name_required",
  "New Cycle Id is required": "api_errors.new_cycle_id_required",
  "No asset ids provided.": "api_errors.no_asset_ids_provided",
  "Network connection error. Please check your internet connection.": "api_errors.email_network_connection_failed",
  "Only admin or creator can delete the cycle": "api_errors.cycle_delete_admin_or_creator",
  "Only admin or creator can delete the module": "api_errors.module_delete_admin_or_creator",
  "Only admin or creator can delete the work item": "api_errors.work_item_delete_admin_or_creator",
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
  "Parent is not valid issue_id please pass a valid issue_id": "api_errors.invalid_parent_issue",
  "Permission denied": "api_errors.permission_denied",
  "Pipeline item does not belong to this issue": "api_errors.pipeline_item_wrong_issue",
  "Pipeline item target date cannot be later than the parent issue target date":
    "api_errors.pipeline_item_target_after_parent",
  "Pipeline item start date cannot be earlier than the previous item target date":
    "api_errors.pipeline_item_start_before_previous",
  "Pipeline item target date cannot be later than the next item start date":
    "api_errors.pipeline_item_target_after_next_start",
  "Pipeline can only be initialized on a parent issue": "api_errors.pipeline_parent_only",
  "Pipeline item not found": "api_errors.pipeline_item_not_found",
  "Parent issue due date cannot be earlier than existing pipeline step due dates":
    "api_errors.parent_issue_deadline_before_pipeline_step",
  "Parent issue target date cannot be earlier than existing pipeline step due dates":
    "api_errors.parent_issue_deadline_before_pipeline_step",
  "Please provide valid detail": "api_errors.provide_valid_detail",
  "Preference not found": "api_errors.preference_not_found",
  "Project ID is required": "api_errors.project_id_required",
  "Project does not exist": "api_errors.project_not_found",
  "Project has no pipeline states": "api_errors.project_has_no_pipeline_states",
  "Project identifier cannot contain special characters.": "api_errors.project_identifier_special_chars",
  "Project is not published": "api_errors.project_not_published",
  "Project is required to create an issue.": "api_errors.project_required_to_create_issue",
  "Project lead should be a user in the workspace": "api_errors.project_lead_workspace_user",
  "Project member not found": "api_errors.project_member_not_found",
  "Project name cannot contain special characters.": "api_errors.project_name_special_chars",
  "Project not found": "api_errors.project_not_found",
  "Receiver email is required": "api_errors.email_receiver_required",
  "Provided workspace does not exist": "api_errors.workspace_not_found",
  "Quick link not found.": "api_errors.quick_link_not_found",
  "Reaction already exists for the user": "api_errors.reaction_already_exists",
  "Requested resource could not be found.": "api_errors.requested_resource_not_found",
  "REQUEST_BODY_TOO_LARGE": "api_errors.request_body_too_large",
  "State is not valid please pass a valid state_id": "api_errors.invalid_state",
  "State with the same external id and external source already exists": "api_errors.state_external_id_exists",
  "State with the same name already exists in the project": "api_errors.state_name_exists",
  "Something went wrong please try again later": "api_errors.something_went_wrong_try_later",
  "SMTP server disconnected unexpectedly.": "api_errors.email_smtp_disconnected",
  "Source cycle not found": "api_errors.source_cycle_not_found",
  "Start date and end date both are required": "api_errors.start_and_end_dates_required",
  "Start date cannot exceed end date": "api_errors.start_date_after_end_date",
  "Start date cannot exceed target date": "api_errors.start_date_after_target",
  "Success": "api_errors.success",
  "Successful": "api_errors.success",
  "Successfully updated": "api_errors.successfully_updated",
  "Sub Issue IDs are required": "api_errors.sub_issue_ids_required",
  "The page should be archived before deleting": "api_errors.page_archive_before_delete",
  "The size of the request body exceeds the maximum allowed size.": "api_errors.request_body_too_large_detail",
  "The state is not empty, only empty states can be deleted": "api_errors.state_not_empty",
  "Timeout error while trying to connect to the SMTP server.": "api_errors.email_smtp_timeout",
  "Task is required": "api_errors.task_required",
  "The Cycle has already been completed so it cannot be edited": "api_errors.completed_cycle_cannot_be_edited",
  "The Cycle has already been completed so no new issues can be added": "api_errors.completed_cycle_cannot_add_issues",
  "The asset is not uploaded.": "api_errors.asset_not_uploaded",
  "The cycle where the issues are transferred is already completed": "api_errors.transfer_cycle_completed",
  "The maximum length for name is 80 and for slug is 48": "api_errors.workspace_name_slug_max_length",
  "The payload is not valid": "api_errors.payload_not_valid",
  "The requested asset could not be found.": "api_errors.asset_not_found",
  "The requested resource does not exist.": "api_errors.requested_resource_not_found",
  "The required key does not exist.": "api_errors.required_key_missing",
  "The required object does not exist.": "api_errors.required_object_missing",
  "Triage state not found": "api_errors.triage_state_not_found",
  "Updated successfully": "api_errors.successfully_updated",
  "Could not connect with the SMTP server.": "api_errors.email_smtp_connection_failed",
  "Could not send email. Please check your configuration": "api_errors.email_send_failed",
  "From address is invalid.": "api_errors.email_from_address_invalid",
  "URL already exists for this Issue": "api_errors.issue_url_exists",
  "URL already exists for the workspace": "api_errors.webhook_url_exists",
  "URL already exists for this workspace and owner": "api_errors.workspace_owner_url_exists",
  "User already subscribed to the issue.": "api_errors.user_already_subscribed",
  "User is a part of some projects where they are the only admin, they should either leave that project or promote another user to admin.":
    "api_errors.user_only_admin_in_some_projects",
  "Workspace Slug is required": "api_errors.workspace_slug_required",
  "Workspace creation is not allowed": "api_errors.workspace_creation_not_allowed",
  "Workspace does not exist": "api_errors.workspace_not_found",
  "Workspace member not found": "api_errors.workspace_member_not_found",
  "Work item comment with the same external id and external source already exists":
    "api_errors.work_item_comment_external_id_exists",
  "Work items are required": "api_errors.issues_required",
  "You are a part of some projects where you are the only admin, you should either leave the project or promote another user to admin.":
    "api_errors.you_only_admin_in_some_projects",
  "You are not a member of this project": "api_errors.not_project_member",
  "You are not allowed to comment on the issue": "api_errors.comment_not_allowed",
  "You are not allowed to delete this attachment": "api_errors.attachment_delete_not_allowed",
  "You are not allowed to download this attachment": "api_errors.attachment_download_not_allowed",
  "You are not allowed to upload this attachment": "api_errors.attachment_upload_not_allowed",
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
  const visited = new WeakSet<object>();

  const localize = (value: unknown): unknown => {
    if (!value || typeof value !== "object" || visited.has(value)) return value;
    visited.add(value);

    if (Array.isArray(value)) {
      value.forEach(localize);
      return value;
    }

    Object.entries(value as Record<string, unknown>).forEach(([key, nestedValue]) => {
      if (LOCALIZABLE_ERROR_FIELDS.has(key) && typeof nestedValue === "string") {
        (value as Record<string, unknown>)[key] = localizeAPIErrorText(nestedValue);
        return;
      }

      localize(nestedValue);
    });

    return value;
  };

  return localize(payload);
};
