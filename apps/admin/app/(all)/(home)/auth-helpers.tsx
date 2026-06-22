/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import Link from "next/link";
// plane packages
import type { TAdminAuthErrorInfo } from "@plane/constants";
import { SUPPORT_EMAIL, EAdminAuthErrorCodes } from "@plane/constants";

export enum EErrorAlertType {
  BANNER_ALERT = "BANNER_ALERT",
  INLINE_FIRST_NAME = "INLINE_FIRST_NAME",
  INLINE_EMAIL = "INLINE_EMAIL",
  INLINE_PASSWORD = "INLINE_PASSWORD",
  INLINE_EMAIL_CODE = "INLINE_EMAIL_CODE",
}

type TTranslateFn = (key: string, fallback?: string) => string;

const errorCodeMessages: {
  [key in EAdminAuthErrorCodes]: { title: string; message: (email?: string) => React.ReactNode };
} = {
  // admin
  [EAdminAuthErrorCodes.ADMIN_ALREADY_EXIST]: {
    title: `Admin already exists`,
    message: () => `Admin already exists. Please try again.`,
  },
  [EAdminAuthErrorCodes.REQUIRED_ADMIN_EMAIL_PASSWORD_FIRST_NAME]: {
    title: `Email, password and first name required`,
    message: () => `Email, password and first name required. Please try again.`,
  },
  [EAdminAuthErrorCodes.INVALID_ADMIN_EMAIL]: {
    title: `Invalid admin email`,
    message: () => `Invalid admin email. Please try again.`,
  },
  [EAdminAuthErrorCodes.INVALID_ADMIN_PASSWORD]: {
    title: `Invalid admin password`,
    message: () => `Invalid admin password. Please try again.`,
  },
  [EAdminAuthErrorCodes.REQUIRED_ADMIN_EMAIL_PASSWORD]: {
    title: `Email and password required`,
    message: () => `Email and password required. Please try again.`,
  },
  [EAdminAuthErrorCodes.ADMIN_AUTHENTICATION_FAILED]: {
    title: `Authentication failed`,
    message: () => `Authentication failed. Please try again.`,
  },
  [EAdminAuthErrorCodes.ADMIN_USER_ALREADY_EXIST]: {
    title: `Authentication failed`,
    message: () => `Authentication failed. Please try again.`,
  },
  [EAdminAuthErrorCodes.ADMIN_USER_DOES_NOT_EXIST]: {
    title: `Authentication failed`,
    message: () => `Authentication failed. Please try again.`,
  },
  [EAdminAuthErrorCodes.ADMIN_USER_DEACTIVATED]: {
    title: `User account deactivated`,
    message: () => `User account deactivated. Please contact ${SUPPORT_EMAIL ? SUPPORT_EMAIL : "administrator"}.`,
  },
};

const AUTH_ERROR_I18N_KEYS: Partial<Record<EAdminAuthErrorCodes, { title: string; message: string }>> = {
  [EAdminAuthErrorCodes.ADMIN_ALREADY_EXIST]: {
    title: "auth_error_admin_already_exists_title",
    message: "auth_error_admin_already_exists_message",
  },
  [EAdminAuthErrorCodes.REQUIRED_ADMIN_EMAIL_PASSWORD_FIRST_NAME]: {
    title: "auth_error_admin_required_email_password_first_name_title",
    message: "auth_error_admin_required_email_password_first_name_message",
  },
  [EAdminAuthErrorCodes.INVALID_ADMIN_EMAIL]: {
    title: "auth_error_invalid_admin_email_title",
    message: "auth_error_invalid_admin_email_message",
  },
  [EAdminAuthErrorCodes.INVALID_ADMIN_PASSWORD]: {
    title: "auth_error_invalid_admin_password_title",
    message: "auth_error_invalid_admin_password_message",
  },
  [EAdminAuthErrorCodes.REQUIRED_ADMIN_EMAIL_PASSWORD]: {
    title: "auth_error_email_and_password_required_title",
    message: "auth_error_email_and_password_required_message",
  },
  [EAdminAuthErrorCodes.ADMIN_AUTHENTICATION_FAILED]: {
    title: "auth_error_authentication_failed_title",
    message: "auth_error_authentication_failed_message",
  },
  [EAdminAuthErrorCodes.ADMIN_USER_ALREADY_EXIST]: {
    title: "auth_error_admin_user_already_exists_title",
    message: "auth_error_admin_user_already_exists_message",
  },
  [EAdminAuthErrorCodes.ADMIN_USER_DOES_NOT_EXIST]: {
    title: "auth_error_admin_user_does_not_exist_title",
    message: "auth_error_admin_user_does_not_exist_message",
  },
  [EAdminAuthErrorCodes.ADMIN_USER_DEACTIVATED]: {
    title: "auth_error_user_account_deactivated_title",
    message: "auth_error_user_account_deactivated_message",
  },
};

export const authErrorHandler = (
  errorCode: EAdminAuthErrorCodes,
  email?: string,
  t?: TTranslateFn
): TAdminAuthErrorInfo | undefined => {
  const tt = (key: string, fallback: string) => {
    if (!t) return fallback;
    const translated = t(key);
    return translated === key ? fallback : translated;
  };

  const bannerAlertErrorCodes = [
    EAdminAuthErrorCodes.ADMIN_ALREADY_EXIST,
    EAdminAuthErrorCodes.REQUIRED_ADMIN_EMAIL_PASSWORD_FIRST_NAME,
    EAdminAuthErrorCodes.INVALID_ADMIN_EMAIL,
    EAdminAuthErrorCodes.INVALID_ADMIN_PASSWORD,
    EAdminAuthErrorCodes.REQUIRED_ADMIN_EMAIL_PASSWORD,
    EAdminAuthErrorCodes.ADMIN_AUTHENTICATION_FAILED,
    EAdminAuthErrorCodes.ADMIN_USER_ALREADY_EXIST,
    EAdminAuthErrorCodes.ADMIN_USER_DOES_NOT_EXIST,
    EAdminAuthErrorCodes.ADMIN_USER_DEACTIVATED,
  ];

  if (bannerAlertErrorCodes.includes(errorCode)) {
    const fallbackTitle = errorCodeMessages[errorCode]?.title || "Error";
    const fallbackMessageNode = errorCodeMessages[errorCode]?.message(email) || "Something went wrong. Please try again.";
    const fallbackMessage =
      typeof fallbackMessageNode === "string" ? fallbackMessageNode : "Something went wrong. Please try again.";
    const i18nKeys = AUTH_ERROR_I18N_KEYS[errorCode];

    const translatedTitle = i18nKeys ? tt(i18nKeys.title, fallbackTitle) : fallbackTitle;
    const translatedMessage = i18nKeys ? tt(i18nKeys.message, fallbackMessage) : fallbackMessage;

    if (
      [EAdminAuthErrorCodes.ADMIN_USER_ALREADY_EXIST, EAdminAuthErrorCodes.ADMIN_USER_DOES_NOT_EXIST].includes(
        errorCode
      )
    ) {
      return {
        type: EErrorAlertType.BANNER_ALERT,
        code: errorCode,
        title: translatedTitle,
        message: (
          <div>
            {translatedMessage}&nbsp;
            <Link className="font-medium underline underline-offset-4 transition-all hover:font-bold" href={`/admin`}>
              {tt("sign_in_link", "")}
            </Link>
          </div>
        ),
      };
    }

    return {
      type: EErrorAlertType.BANNER_ALERT,
      code: errorCode,
      title: translatedTitle,
      message: i18nKeys ? translatedMessage : fallbackMessageNode,
    };
  }

  return undefined;
};
