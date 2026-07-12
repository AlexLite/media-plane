/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useState } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
import { useDropzone } from "react-dropzone";
// plane imports
import { useTranslation } from "@plane/i18n";
import { ACCEPTED_AVATAR_IMAGE_MIME_TYPES_FOR_REACT_DROPZONE, MAX_FILE_SIZE } from "@plane/constants";
import { Button } from "@plane/propel/button";
import { UserCirclePropertyIcon } from "@plane/propel/icons";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import { EFileAssetType } from "@plane/types";
import { EModalPosition, EModalWidth, ModalCore } from "@plane/ui";
import { getAssetIdFromUrl, getFileURL, checkURLValidity } from "@plane/utils";
// hooks
import { useWorkspace } from "@/hooks/store/use-workspace";
// services
import { FileService } from "@/services/file.service";

type Props = {
  handleRemove: () => Promise<void>;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (url: string) => void;
  value: string | null;
};

// services
const fileService = new FileService();

export const WorkspaceImageUploadModal = observer(function WorkspaceImageUploadModal(props: Props) {
  const { t } = useTranslation();
  const { handleRemove, isOpen, onClose, onSuccess, value } = props;
  // states
  const [image, setImage] = useState<File | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isImageUploading, setIsImageUploading] = useState(false);
  // router
  const { workspaceSlug } = useParams();
  // store hooks
  const { currentWorkspace, updateWorkspaceLogo } = useWorkspace();

  const onDrop = (acceptedFiles: File[]) => setImage(acceptedFiles[0]);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: ACCEPTED_AVATAR_IMAGE_MIME_TYPES_FOR_REACT_DROPZONE,
    maxSize: MAX_FILE_SIZE,
    multiple: false,
  });

  const handleClose = () => {
    setIsImageUploading(false);
    onClose();
    setTimeout(() => {
      setImage(null);
    }, 300);
  };

  const handleSubmit = async () => {
    if (!image || !workspaceSlug || !currentWorkspace) return;
    setIsImageUploading(true);

    try {
      const { asset_url } = await fileService.uploadWorkspaceAsset(
        workspaceSlug.toString(),
        {
          entity_identifier: currentWorkspace.id,
          entity_type: EFileAssetType.WORKSPACE_LOGO,
        },
        image
      );
      updateWorkspaceLogo(workspaceSlug.toString(), asset_url);
      onSuccess(asset_url);
    } catch (error: any) {
      console.log("error", error);
      setToast({
        type: TOAST_TYPE.ERROR,
        title: t("error"),
        message: error.error || t("something_went_wrong_please_try_again"),
      });
    } finally {
      setIsImageUploading(false);
    }
  };

  const handleImageRemove = async () => {
    if (!workspaceSlug || !value) return;
    setIsRemoving(true);
    try {
      if (checkURLValidity(value)) {
        await fileService.deleteOldWorkspaceAsset(currentWorkspace?.id ?? "", value);
      } else {
        const assetId = getAssetIdFromUrl(value);
        await fileService.deleteWorkspaceAsset(workspaceSlug.toString(), assetId);
      }
      await handleRemove();
      handleClose();
    } catch (error) {
      console.log("Error in removing workspace asset:", error);
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <ModalCore isOpen={isOpen} handleClose={handleClose} position={EModalPosition.CENTER} width={EModalWidth.XL}>
      <div className="space-y-5 px-5 py-8 sm:p-6">
        <h3 className="text-16 leading-6 font-medium text-primary">
          {t("onboarding_profile_setup.profile_step.image_upload.title")}
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-3">
            <div
              {...getRootProps()}
              className={`relative grid h-80 w-80 cursor-pointer place-items-center rounded-lg p-12 text-center focus:ring-2 focus:ring-accent-strong focus:ring-offset-2 focus:outline-none ${
                (image === null && isDragActive) || !value
                  ? "border-2 border-dashed border-subtle hover:bg-surface-2"
                  : ""
              }`}
            >
              {image !== null || (value && value !== "") ? (
                <>
                  <button
                    type="button"
                    className="absolute top-0 right-0 z-40 translate-x-1/2 -translate-y-1/2 rounded-sm bg-surface-2 px-2 py-0.5 text-11 font-medium text-secondary"
                  >
                    {t("onboarding_profile_setup.profile_step.image_upload.edit")}
                  </button>
                  <img
                    src={image ? URL.createObjectURL(image) : value ? getFileURL(value) : ""}
                    alt="image"
                    className="absolute top-0 left-0 h-full w-full rounded-md object-cover"
                  />
                </>
              ) : (
                <div>
                  <UserCirclePropertyIcon className="mx-auto h-16 w-16 text-secondary" />
                  <span className="mt-2 block text-13 font-medium text-secondary">
                    {isDragActive
                      ? t("onboarding_profile_setup.profile_step.image_upload.drop")
                      : t("onboarding_profile_setup.profile_step.image_upload.drag")}
                  </span>
                </div>
              )}

              <input {...getInputProps()} />
            </div>
          </div>
          {fileRejections.length > 0 && (
            <p className="text-13 text-danger-primary">
              {fileRejections[0].errors[0].code === "file-too-large"
                ? t("onboarding_profile_setup.profile_step.image_upload.too_large")
                : t("onboarding_profile_setup.profile_step.image_upload.invalid_format")}
            </p>
          )}
        </div>
        <p className="my-4 text-13 text-secondary">{t("onboarding_profile_setup.profile_step.image_upload.formats")}</p>
        <div className="flex items-center justify-between">
          <Button variant="error-fill" size="lg" onClick={handleImageRemove} disabled={!value} loading={isRemoving}>
            {isRemoving
              ? t("onboarding_profile_setup.profile_step.image_upload.removing")
              : t("onboarding_profile_setup.profile_step.image_upload.remove")}
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="lg" onClick={handleClose}>
              {t("onboarding_profile_setup.profile_step.image_upload.cancel")}
            </Button>
            <Button variant="primary" size="lg" onClick={handleSubmit} disabled={!image} loading={isImageUploading}>
              {isImageUploading
                ? t("onboarding_profile_setup.profile_step.image_upload.uploading")
                : t("onboarding_profile_setup.profile_step.image_upload.save")}
            </Button>
          </div>
        </div>
      </div>
    </ModalCore>
  );
});
