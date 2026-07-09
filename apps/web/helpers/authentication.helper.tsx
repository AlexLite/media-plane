/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { ReactNode } from "react";
import Link from "next/link";
// plane imports
import { SUPPORT_EMAIL } from "@plane/constants";

export enum EPageTypes {
  PUBLIC = "PUBLIC",
  NON_AUTHENTICATED = "NON_AUTHENTICATED",
  SET_PASSWORD = "SET_PASSWORD",
  ONBOARDING = "ONBOARDING",
  AUTHENTICATED = "AUTHENTICATED",
}

export enum EAuthModes {
  SIGN_IN = "SIGN_IN",
  SIGN_UP = "SIGN_UP",
}

export enum EAuthSteps {
  EMAIL = "EMAIL",
  PASSWORD = "PASSWORD",
  UNIQUE_CODE = "UNIQUE_CODE",
}

export enum EErrorAlertType {
  BANNER_ALERT = "BANNER_ALERT",
  INLINE_FIRST_NAME = "INLINE_FIRST_NAME",
  INLINE_EMAIL = "INLINE_EMAIL",
  INLINE_PASSWORD = "INLINE_PASSWORD",
  INLINE_EMAIL_CODE = "INLINE_EMAIL_CODE",
}

export enum EAuthenticationErrorCodes {
  // Global
  INSTANCE_NOT_CONFIGURED = "5000",
  INVALID_EMAIL = "5005",
  EMAIL_REQUIRED = "5010",
  SIGNUP_DISABLED = "5015",
  MAGIC_LINK_LOGIN_DISABLED = "5016",
  PASSWORD_LOGIN_DISABLED = "5018",
  USER_ACCOUNT_DEACTIVATED = "5019",
  // Password strength
  INVALID_PASSWORD = "5020",
  PASSWORD_TOO_WEAK = "5021",
  SMTP_NOT_CONFIGURED = "5025",
  // Sign Up
  USER_ALREADY_EXIST = "5030",
  AUTHENTICATION_FAILED_SIGN_UP = "5035",
  REQUIRED_EMAIL_PASSWORD_SIGN_UP = "5040",
  INVALID_EMAIL_SIGN_UP = "5045",
  INVALID_EMAIL_MAGIC_SIGN_UP = "5050",
  MAGIC_SIGN_UP_EMAIL_CODE_REQUIRED = "5055",
  // Sign In
  USER_DOES_NOT_EXIST = "5060",
  AUTHENTICATION_FAILED_SIGN_IN = "5065",
  REQUIRED_EMAIL_PASSWORD_SIGN_IN = "5070",
  INVALID_EMAIL_SIGN_IN = "5075",
  INVALID_EMAIL_MAGIC_SIGN_IN = "5080",
  MAGIC_SIGN_IN_EMAIL_CODE_REQUIRED = "5085",
  // Both Sign in and Sign up for magic
  INVALID_MAGIC_CODE_SIGN_IN = "5090",
  INVALID_MAGIC_CODE_SIGN_UP = "5092",
  EXPIRED_MAGIC_CODE_SIGN_IN = "5095",
  EXPIRED_MAGIC_CODE_SIGN_UP = "5097",
  EMAIL_CODE_ATTEMPT_EXHAUSTED_SIGN_IN = "5100",
  EMAIL_CODE_ATTEMPT_EXHAUSTED_SIGN_UP = "5102",
  // Oauth
  OAUTH_NOT_CONFIGURED = "5104",
  GOOGLE_NOT_CONFIGURED = "5105",
  GITHUB_NOT_CONFIGURED = "5110",
  GITLAB_NOT_CONFIGURED = "5111",
  GOOGLE_OAUTH_PROVIDER_ERROR = "5115",
  GITHUB_OAUTH_PROVIDER_ERROR = "5120",
  GITLAB_OAUTH_PROVIDER_ERROR = "5121",
  // Reset Password
  INVALID_PASSWORD_TOKEN = "5125",
  EXPIRED_PASSWORD_TOKEN = "5130",
  // Change password
  INCORRECT_OLD_PASSWORD = "5135",
  MISSING_PASSWORD = "5138",
  INVALID_NEW_PASSWORD = "5140",
  // set password
  PASSWORD_ALREADY_SET = "5145",
  // Admin
  ADMIN_ALREADY_EXIST = "5150",
  REQUIRED_ADMIN_EMAIL_PASSWORD_FIRST_NAME = "5155",
  INVALID_ADMIN_EMAIL = "5160",
  INVALID_ADMIN_PASSWORD = "5165",
  REQUIRED_ADMIN_EMAIL_PASSWORD = "5170",
  ADMIN_AUTHENTICATION_FAILED = "5175",
  ADMIN_USER_ALREADY_EXIST = "5180",
  ADMIN_USER_DOES_NOT_EXIST = "5185",
  ADMIN_USER_DEACTIVATED = "5190",
  // Rate limit
  RATE_LIMIT_EXCEEDED = "5900",
}

export type TAuthErrorInfo = {
  type: EErrorAlertType;
  code: EAuthenticationErrorCodes;
  title: string;
  message: ReactNode;
};

type TTranslateFn = (key: string, params?: Record<string, unknown>) => string;

const AUTH_ERROR_I18N_KEYS: Partial<Record<EAuthenticationErrorCodes, { title: string; message: string }>> = {
  [EAuthenticationErrorCodes.INSTANCE_NOT_CONFIGURED]: {
    title: "auth.error_codes.instance_not_configured.title",
    message: "auth.error_codes.instance_not_configured.message",
  },
  [EAuthenticationErrorCodes.INVALID_EMAIL]: {
    title: "auth.error_codes.invalid_email.title",
    message: "auth.error_codes.invalid_email.message",
  },
  [EAuthenticationErrorCodes.EMAIL_REQUIRED]: {
    title: "auth.error_codes.email_required.title",
    message: "auth.error_codes.email_required.message",
  },
  [EAuthenticationErrorCodes.SIGNUP_DISABLED]: {
    title: "auth.error_codes.signup_disabled.title",
    message: "auth.error_codes.signup_disabled.message",
  },
  [EAuthenticationErrorCodes.MAGIC_LINK_LOGIN_DISABLED]: {
    title: "auth.error_codes.magic_link_login_disabled.title",
    message: "auth.error_codes.magic_link_login_disabled.message",
  },
  [EAuthenticationErrorCodes.PASSWORD_LOGIN_DISABLED]: {
    title: "auth.error_codes.password_login_disabled.title",
    message: "auth.error_codes.password_login_disabled.message",
  },
  [EAuthenticationErrorCodes.USER_ACCOUNT_DEACTIVATED]: {
    title: "auth.error_codes.user_account_deactivated.title",
    message: "auth.error_codes.user_account_deactivated.message",
  },
  [EAuthenticationErrorCodes.INVALID_PASSWORD]: {
    title: "auth.error_codes.invalid_password.title",
    message: "auth.error_codes.invalid_password.message",
  },
  [EAuthenticationErrorCodes.PASSWORD_TOO_WEAK]: {
    title: "auth.error_codes.password_too_weak.title",
    message: "auth.error_codes.password_too_weak.message",
  },
  [EAuthenticationErrorCodes.SMTP_NOT_CONFIGURED]: {
    title: "auth.error_codes.smtp_not_configured.title",
    message: "auth.error_codes.smtp_not_configured.message",
  },
  [EAuthenticationErrorCodes.AUTHENTICATION_FAILED_SIGN_UP]: {
    title: "auth.error_codes.authentication_failed.title",
    message: "auth.error_codes.authentication_failed.message",
  },
  [EAuthenticationErrorCodes.AUTHENTICATION_FAILED_SIGN_IN]: {
    title: "auth.error_codes.authentication_failed.title",
    message: "auth.error_codes.authentication_failed.message",
  },
  [EAuthenticationErrorCodes.REQUIRED_EMAIL_PASSWORD_SIGN_UP]: {
    title: "auth.error_codes.email_and_password_required.title",
    message: "auth.error_codes.email_and_password_required.message",
  },
  [EAuthenticationErrorCodes.REQUIRED_EMAIL_PASSWORD_SIGN_IN]: {
    title: "auth.error_codes.email_and_password_required.title",
    message: "auth.error_codes.email_and_password_required.message",
  },
  [EAuthenticationErrorCodes.MAGIC_SIGN_UP_EMAIL_CODE_REQUIRED]: {
    title: "auth.error_codes.email_and_code_required.title",
    message: "auth.error_codes.email_and_code_required.message",
  },
  [EAuthenticationErrorCodes.MAGIC_SIGN_IN_EMAIL_CODE_REQUIRED]: {
    title: "auth.error_codes.email_and_code_required.title",
    message: "auth.error_codes.email_and_code_required.message",
  },
  [EAuthenticationErrorCodes.INVALID_EMAIL_SIGN_UP]: {
    title: "auth.error_codes.invalid_email.title",
    message: "auth.error_codes.invalid_email.message",
  },
  [EAuthenticationErrorCodes.INVALID_EMAIL_MAGIC_SIGN_UP]: {
    title: "auth.error_codes.invalid_email.title",
    message: "auth.error_codes.invalid_email.message",
  },
  [EAuthenticationErrorCodes.INVALID_EMAIL_SIGN_IN]: {
    title: "auth.error_codes.invalid_email.title",
    message: "auth.error_codes.invalid_email.message",
  },
  [EAuthenticationErrorCodes.INVALID_EMAIL_MAGIC_SIGN_IN]: {
    title: "auth.error_codes.invalid_email.title",
    message: "auth.error_codes.invalid_email.message",
  },
  [EAuthenticationErrorCodes.INVALID_MAGIC_CODE_SIGN_UP]: {
    title: "auth.error_codes.authentication_failed.title",
    message: "auth.error_codes.invalid_magic_code.message",
  },
  [EAuthenticationErrorCodes.INVALID_MAGIC_CODE_SIGN_IN]: {
    title: "auth.error_codes.authentication_failed.title",
    message: "auth.error_codes.invalid_magic_code.message",
  },
  [EAuthenticationErrorCodes.EXPIRED_MAGIC_CODE_SIGN_UP]: {
    title: "auth.error_codes.expired_magic_code.title",
    message: "auth.error_codes.expired_magic_code.message",
  },
  [EAuthenticationErrorCodes.EXPIRED_MAGIC_CODE_SIGN_IN]: {
    title: "auth.error_codes.expired_magic_code.title",
    message: "auth.error_codes.expired_magic_code.message",
  },
  [EAuthenticationErrorCodes.EMAIL_CODE_ATTEMPT_EXHAUSTED_SIGN_UP]: {
    title: "auth.error_codes.expired_magic_code.title",
    message: "auth.error_codes.expired_magic_code.message",
  },
  [EAuthenticationErrorCodes.EMAIL_CODE_ATTEMPT_EXHAUSTED_SIGN_IN]: {
    title: "auth.error_codes.expired_magic_code.title",
    message: "auth.error_codes.expired_magic_code.message",
  },
  [EAuthenticationErrorCodes.OAUTH_NOT_CONFIGURED]: {
    title: "auth.error_codes.oauth_not_configured.title",
    message: "auth.error_codes.oauth_not_configured.message",
  },
  [EAuthenticationErrorCodes.GOOGLE_NOT_CONFIGURED]: {
    title: "auth.error_codes.google_not_configured.title",
    message: "auth.error_codes.google_not_configured.message",
  },
  [EAuthenticationErrorCodes.GITHUB_NOT_CONFIGURED]: {
    title: "auth.error_codes.github_not_configured.title",
    message: "auth.error_codes.github_not_configured.message",
  },
  [EAuthenticationErrorCodes.GITLAB_NOT_CONFIGURED]: {
    title: "auth.error_codes.gitlab_not_configured.title",
    message: "auth.error_codes.gitlab_not_configured.message",
  },
  [EAuthenticationErrorCodes.GOOGLE_OAUTH_PROVIDER_ERROR]: {
    title: "auth.error_codes.google_oauth_provider_error.title",
    message: "auth.error_codes.google_oauth_provider_error.message",
  },
  [EAuthenticationErrorCodes.GITHUB_OAUTH_PROVIDER_ERROR]: {
    title: "auth.error_codes.github_oauth_provider_error.title",
    message: "auth.error_codes.github_oauth_provider_error.message",
  },
  [EAuthenticationErrorCodes.GITLAB_OAUTH_PROVIDER_ERROR]: {
    title: "auth.error_codes.gitlab_oauth_provider_error.title",
    message: "auth.error_codes.gitlab_oauth_provider_error.message",
  },
  [EAuthenticationErrorCodes.INVALID_PASSWORD_TOKEN]: {
    title: "auth.error_codes.invalid_password_token.title",
    message: "auth.error_codes.invalid_password_token.message",
  },
  [EAuthenticationErrorCodes.EXPIRED_PASSWORD_TOKEN]: {
    title: "auth.error_codes.expired_password_token.title",
    message: "auth.error_codes.expired_password_token.message",
  },
  [EAuthenticationErrorCodes.MISSING_PASSWORD]: {
    title: "auth.error_codes.password_required.title",
    message: "auth.error_codes.password_required.message",
  },
  [EAuthenticationErrorCodes.INCORRECT_OLD_PASSWORD]: {
    title: "auth.error_codes.incorrect_old_password.title",
    message: "auth.error_codes.incorrect_old_password.message",
  },
  [EAuthenticationErrorCodes.INVALID_NEW_PASSWORD]: {
    title: "auth.error_codes.invalid_new_password.title",
    message: "auth.error_codes.invalid_new_password.message",
  },
  [EAuthenticationErrorCodes.PASSWORD_ALREADY_SET]: {
    title: "auth.error_codes.password_already_set.title",
    message: "auth.error_codes.password_already_set.message",
  },
  [EAuthenticationErrorCodes.ADMIN_ALREADY_EXIST]: {
    title: "auth.error_codes.admin_already_exists.title",
    message: "auth.error_codes.admin_already_exists.message",
  },
  [EAuthenticationErrorCodes.REQUIRED_ADMIN_EMAIL_PASSWORD_FIRST_NAME]: {
    title: "auth.error_codes.admin_required_email_password_first_name.title",
    message: "auth.error_codes.admin_required_email_password_first_name.message",
  },
  [EAuthenticationErrorCodes.INVALID_ADMIN_EMAIL]: {
    title: "auth.error_codes.invalid_admin_email.title",
    message: "auth.error_codes.invalid_admin_email.message",
  },
  [EAuthenticationErrorCodes.INVALID_ADMIN_PASSWORD]: {
    title: "auth.error_codes.invalid_admin_password.title",
    message: "auth.error_codes.invalid_admin_password.message",
  },
  [EAuthenticationErrorCodes.REQUIRED_ADMIN_EMAIL_PASSWORD]: {
    title: "auth.error_codes.email_and_password_required.title",
    message: "auth.error_codes.email_and_password_required.message",
  },
  [EAuthenticationErrorCodes.ADMIN_AUTHENTICATION_FAILED]: {
    title: "auth.error_codes.authentication_failed.title",
    message: "auth.error_codes.authentication_failed.message",
  },
  [EAuthenticationErrorCodes.ADMIN_USER_DEACTIVATED]: {
    title: "auth.error_codes.admin_user_deactivated.title",
    message: "auth.error_codes.admin_user_deactivated.message",
  },
  [EAuthenticationErrorCodes.RATE_LIMIT_EXCEEDED]: {
    title: "auth.error_codes.rate_limit_exceeded.title",
    message: "auth.error_codes.rate_limit_exceeded.message",
  },
};

// TODO: move all error messages to translation files
const errorCodeMessages: {
  [key in EAuthenticationErrorCodes]: { title: string; message: (email?: string) => ReactNode };
} = {
  // global
  [EAuthenticationErrorCodes.INSTANCE_NOT_CONFIGURED]: {
    title: `Инстанс не настроен`,
    message: () => `Инстанс не настроен. Пожалуйста, обратитесь к администратору.`,
  },
  [EAuthenticationErrorCodes.INVALID_EMAIL]: {
    title: `Некорректный email`,
    message: () => `Некорректный email. Попробуйте еще раз.`,
  },
  [EAuthenticationErrorCodes.EMAIL_REQUIRED]: {
    title: `Требуется email`,
    message: () => `Требуется email. Попробуйте еще раз.`,
  },
  [EAuthenticationErrorCodes.SIGNUP_DISABLED]: {
    title: `Регистрация отключена`,
    message: () => `Регистрация отключена. Пожалуйста, обратитесь к администратору.`,
  },
  [EAuthenticationErrorCodes.MAGIC_LINK_LOGIN_DISABLED]: {
    title: `Вход по magic link отключен`,
    message: () => `Вход по magic link отключен. Пожалуйста, обратитесь к администратору.`,
  },
  [EAuthenticationErrorCodes.PASSWORD_LOGIN_DISABLED]: {
    title: `Вход по паролю отключен`,
    message: () => `Вход по паролю отключен. Пожалуйста, обратитесь к администратору.`,
  },
  [EAuthenticationErrorCodes.USER_ACCOUNT_DEACTIVATED]: {
    title: `Учетная запись пользователя деактивирована`,
    message: () =>
      `Учетная запись пользователя деактивирована. Пожалуйста, обратитесь к ${SUPPORT_EMAIL ? SUPPORT_EMAIL : "администратору"}.`,
  },
  [EAuthenticationErrorCodes.INVALID_PASSWORD]: {
    title: `Неверный пароль`,
    message: () => `Неверный пароль. Попробуйте еще раз.`,
  },
  [EAuthenticationErrorCodes.PASSWORD_TOO_WEAK]: {
    title: `Пароль слишком слабый`,
    message: () => `Пожалуйста, используйте более надежный пароль.`,
  },
  [EAuthenticationErrorCodes.SMTP_NOT_CONFIGURED]: {
    title: `SMTP не настроен`,
    message: () => `SMTP не настроен. Пожалуйста, обратитесь к администратору.`,
  },

  // sign up
  [EAuthenticationErrorCodes.USER_ALREADY_EXIST]: {
    title: `Пользователь уже существует`,
    message: (email = undefined) => (
      <div>
        Ваша учетная запись уже зарегистрирована.&nbsp;
        <Link
          className="font-medium underline underline-offset-4 transition-all hover:font-bold"
          href={`/sign-in${email ? `?email=${encodeURIComponent(email)}` : ``}`}
        >
          Войти
        </Link>
        &nbsp;сейчас.
      </div>
    ),
  },
  [EAuthenticationErrorCodes.REQUIRED_EMAIL_PASSWORD_SIGN_UP]: {
    title: `Требуются email и пароль`,
    message: () => `Требуются email и пароль. Попробуйте еще раз.`,
  },
  [EAuthenticationErrorCodes.AUTHENTICATION_FAILED_SIGN_UP]: {
    title: `Ошибка аутентификации`,
    message: () => `Ошибка аутентификации. Попробуйте еще раз.`,
  },
  [EAuthenticationErrorCodes.INVALID_EMAIL_SIGN_UP]: {
    title: `Некорректный email`,
    message: () => `Некорректный email. Попробуйте еще раз.`,
  },
  [EAuthenticationErrorCodes.MAGIC_SIGN_UP_EMAIL_CODE_REQUIRED]: {
    title: `Требуются email и код`,
    message: () => `Требуются email и код. Попробуйте еще раз.`,
  },
  [EAuthenticationErrorCodes.INVALID_EMAIL_MAGIC_SIGN_UP]: {
    title: `Некорректный email`,
    message: () => `Некорректный email. Попробуйте еще раз.`,
  },

  [EAuthenticationErrorCodes.USER_DOES_NOT_EXIST]: {
    title: `Пользователь не существует`,
    message: (email = undefined) => (
      <div>
        Аккаунт не найден.&nbsp;
        <Link
          className="font-medium underline underline-offset-4 transition-all hover:font-bold"
          href={`/${email ? `?email=${encodeURIComponent(email)}` : ``}`}
        >
          Создать
        </Link>
        &nbsp;чтобы начать.
      </div>
    ),
  },
  [EAuthenticationErrorCodes.REQUIRED_EMAIL_PASSWORD_SIGN_IN]: {
    title: `Требуются email и пароль`,
    message: () => `Требуются email и пароль. Попробуйте еще раз.`,
  },
  [EAuthenticationErrorCodes.AUTHENTICATION_FAILED_SIGN_IN]: {
    title: `Ошибка аутентификации`,
    message: () => `Ошибка аутентификации. Попробуйте еще раз.`,
  },
  [EAuthenticationErrorCodes.INVALID_EMAIL_SIGN_IN]: {
    title: `Некорректный email`,
    message: () => `Некорректный email. Попробуйте еще раз.`,
  },
  [EAuthenticationErrorCodes.MAGIC_SIGN_IN_EMAIL_CODE_REQUIRED]: {
    title: `Требуются email и код`,
    message: () => `Требуются email и код. Попробуйте еще раз.`,
  },
  [EAuthenticationErrorCodes.INVALID_EMAIL_MAGIC_SIGN_IN]: {
    title: `Некорректный email`,
    message: () => `Некорректный email. Попробуйте еще раз.`,
  },

  // Both Sign in and Sign up
  [EAuthenticationErrorCodes.INVALID_MAGIC_CODE_SIGN_IN]: {
    title: `Ошибка аутентификации`,
    message: () => `Неверный magic code. Попробуйте еще раз.`,
  },
  [EAuthenticationErrorCodes.INVALID_MAGIC_CODE_SIGN_UP]: {
    title: `Ошибка аутентификации`,
    message: () => `Неверный magic code. Попробуйте еще раз.`,
  },
  [EAuthenticationErrorCodes.EXPIRED_MAGIC_CODE_SIGN_IN]: {
    title: `Истекший magic code`,
    message: () => `Истекший magic code. Попробуйте еще раз.`,
  },
  [EAuthenticationErrorCodes.EXPIRED_MAGIC_CODE_SIGN_UP]: {
    title: `Истекший magic code`,
    message: () => `Истекший magic code. Попробуйте еще раз.`,
  },
  [EAuthenticationErrorCodes.EMAIL_CODE_ATTEMPT_EXHAUSTED_SIGN_IN]: {
    title: `Истекший magic code`,
    message: () => `Истекший magic code. Попробуйте еще раз.`,
  },
  [EAuthenticationErrorCodes.EMAIL_CODE_ATTEMPT_EXHAUSTED_SIGN_UP]: {
    title: `Истекший magic code`,
    message: () => `Истекший magic code. Попробуйте еще раз.`,
  },

  // Oauth
  [EAuthenticationErrorCodes.OAUTH_NOT_CONFIGURED]: {
    title: `OAuth не настроен`,
    message: () => `OAuth не настроен. Пожалуйста, обратитесь к администратору.`,
  },
  [EAuthenticationErrorCodes.GOOGLE_NOT_CONFIGURED]: {
    title: `Google не настроен`,
    message: () => `Google не настроен. Пожалуйста, обратитесь к администратору.`,
  },
  [EAuthenticationErrorCodes.GITHUB_NOT_CONFIGURED]: {
    title: `GitHub не настроен`,
    message: () => `GitHub не настроен. Пожалуйста, обратитесь к администратору.`,
  },
  [EAuthenticationErrorCodes.GITLAB_NOT_CONFIGURED]: {
    title: `GitLab не настроен`,
    message: () => `GitLab не настроен. Пожалуйста, обратитесь к администратору.`,
  },
  [EAuthenticationErrorCodes.GOOGLE_OAUTH_PROVIDER_ERROR]: {
    title: `Ошибка провайдера Google OAuth`,
    message: () => `Ошибка провайдера Google OAuth. Попробуйте еще раз.`,
  },
  [EAuthenticationErrorCodes.GITHUB_OAUTH_PROVIDER_ERROR]: {
    title: `Ошибка провайдера GitHub OAuth`,
    message: () => `Ошибка провайдера GitHub OAuth. Попробуйте еще раз.`,
  },
  [EAuthenticationErrorCodes.GITLAB_OAUTH_PROVIDER_ERROR]: {
    title: `Ошибка провайдера GitLab OAuth`,
    message: () => `Ошибка провайдера GitLab OAuth. Попробуйте еще раз.`,
  },

  // Reset Password
  [EAuthenticationErrorCodes.INVALID_PASSWORD_TOKEN]: {
    title: `Недействительный токен пароля`,
    message: () => `Недействительный токен пароля.`,
  },
  [EAuthenticationErrorCodes.EXPIRED_PASSWORD_TOKEN]: {
    title: `Токен пароля истек`,
    message: () => `Токен пароля истек. Попробуйте еще раз.`,
  },

  // Change password
  [EAuthenticationErrorCodes.MISSING_PASSWORD]: {
    title: `Требуется пароль`,
    message: () => `Требуется пароль. Попробуйте еще раз.`,
  },
  [EAuthenticationErrorCodes.INCORRECT_OLD_PASSWORD]: {
    title: `Неверный старый пароль`,
    message: () => `Неверный старый пароль. Попробуйте еще раз.`,
  },
  [EAuthenticationErrorCodes.INVALID_NEW_PASSWORD]: {
    title: `Новый пароль недействителен`,
    message: () => `Новый пароль недействителен. Попробуйте еще раз.`,
  },

  // set password
  [EAuthenticationErrorCodes.PASSWORD_ALREADY_SET]: {
    title: `Пароль уже задан`,
    message: () => `Пароль уже задан. Попробуйте еще раз.`,
  },

  // admin
  [EAuthenticationErrorCodes.ADMIN_ALREADY_EXIST]: {
    title: `Администратор уже существует`,
    message: () => `Администратор уже существует. Попробуйте еще раз.`,
  },
  [EAuthenticationErrorCodes.REQUIRED_ADMIN_EMAIL_PASSWORD_FIRST_NAME]: {
    title: `Требуются email, пароль и имя`,
    message: () => `Требуются email, пароль и имя. Попробуйте еще раз.`,
  },
  [EAuthenticationErrorCodes.INVALID_ADMIN_EMAIL]: {
    title: `Некорректный email администратора`,
    message: () => `Некорректный email администратора. Попробуйте еще раз.`,
  },
  [EAuthenticationErrorCodes.INVALID_ADMIN_PASSWORD]: {
    title: `Некорректный пароль администратора`,
    message: () => `Некорректный пароль администратора. Попробуйте еще раз.`,
  },
  [EAuthenticationErrorCodes.REQUIRED_ADMIN_EMAIL_PASSWORD]: {
    title: `Требуются email и пароль`,
    message: () => `Требуются email и пароль. Попробуйте еще раз.`,
  },
  [EAuthenticationErrorCodes.ADMIN_AUTHENTICATION_FAILED]: {
    title: `Ошибка аутентификации`,
    message: () => `Ошибка аутентификации. Попробуйте еще раз.`,
  },
  [EAuthenticationErrorCodes.ADMIN_USER_ALREADY_EXIST]: {
    title: `Пользователь администратора уже существует`,
    message: () => (
      <div>
        Пользователь администратора уже существует.&nbsp;
        <Link className="font-medium underline underline-offset-4 transition-all hover:font-bold" href={`/admin`}>
          Войти
        </Link>
        &nbsp;сейчас.
      </div>
    ),
  },
  [EAuthenticationErrorCodes.ADMIN_USER_DOES_NOT_EXIST]: {
    title: `Пользователь администратора не существует`,
    message: () => (
      <div>
        Пользователь администратора не существует.&nbsp;
        <Link className="font-medium underline underline-offset-4 transition-all hover:font-bold" href={`/admin`}>
          Войти
        </Link>
        &nbsp;сейчас.
      </div>
    ),
  },
  [EAuthenticationErrorCodes.ADMIN_USER_DEACTIVATED]: {
    title: `Администратор деактивирован`,
    message: () => <div>Ваша учетная запись деактивирована</div>,
  },
  [EAuthenticationErrorCodes.RATE_LIMIT_EXCEEDED]: {
    title: "",
    message: () => `Превышен лимит запросов. Попробуйте еще раз позже.`,
  },
};

export const authErrorHandler = (
  errorCode: EAuthenticationErrorCodes,
  email?: string,
  t?: TTranslateFn
): TAuthErrorInfo | undefined => {
  const tt = (key: string, fallback: string, params?: Record<string, unknown>) => {
    if (!t) return fallback;
    const translated = t(key, params);
    return translated === key ? fallback : translated;
  };

  const bannerAlertErrorCodes = [
    EAuthenticationErrorCodes.INSTANCE_NOT_CONFIGURED,
    EAuthenticationErrorCodes.INVALID_EMAIL,
    EAuthenticationErrorCodes.EMAIL_REQUIRED,
    EAuthenticationErrorCodes.SIGNUP_DISABLED,
    EAuthenticationErrorCodes.MAGIC_LINK_LOGIN_DISABLED,
    EAuthenticationErrorCodes.PASSWORD_LOGIN_DISABLED,
    EAuthenticationErrorCodes.USER_ACCOUNT_DEACTIVATED,
    EAuthenticationErrorCodes.INVALID_PASSWORD,
    EAuthenticationErrorCodes.SMTP_NOT_CONFIGURED,
    EAuthenticationErrorCodes.USER_ALREADY_EXIST,
    EAuthenticationErrorCodes.AUTHENTICATION_FAILED_SIGN_UP,
    EAuthenticationErrorCodes.REQUIRED_EMAIL_PASSWORD_SIGN_UP,
    EAuthenticationErrorCodes.INVALID_EMAIL_SIGN_UP,
    EAuthenticationErrorCodes.INVALID_EMAIL_MAGIC_SIGN_UP,
    EAuthenticationErrorCodes.MAGIC_SIGN_UP_EMAIL_CODE_REQUIRED,
    EAuthenticationErrorCodes.USER_DOES_NOT_EXIST,
    EAuthenticationErrorCodes.AUTHENTICATION_FAILED_SIGN_IN,
    EAuthenticationErrorCodes.REQUIRED_EMAIL_PASSWORD_SIGN_IN,
    EAuthenticationErrorCodes.INVALID_EMAIL_SIGN_IN,
    EAuthenticationErrorCodes.INVALID_EMAIL_MAGIC_SIGN_IN,
    EAuthenticationErrorCodes.MAGIC_SIGN_IN_EMAIL_CODE_REQUIRED,
    EAuthenticationErrorCodes.INVALID_MAGIC_CODE_SIGN_IN,
    EAuthenticationErrorCodes.INVALID_MAGIC_CODE_SIGN_UP,
    EAuthenticationErrorCodes.EXPIRED_MAGIC_CODE_SIGN_IN,
    EAuthenticationErrorCodes.EXPIRED_MAGIC_CODE_SIGN_UP,
    EAuthenticationErrorCodes.EMAIL_CODE_ATTEMPT_EXHAUSTED_SIGN_IN,
    EAuthenticationErrorCodes.EMAIL_CODE_ATTEMPT_EXHAUSTED_SIGN_UP,
    EAuthenticationErrorCodes.OAUTH_NOT_CONFIGURED,
    EAuthenticationErrorCodes.GOOGLE_NOT_CONFIGURED,
    EAuthenticationErrorCodes.GITHUB_NOT_CONFIGURED,
    EAuthenticationErrorCodes.GITLAB_NOT_CONFIGURED,
    EAuthenticationErrorCodes.GOOGLE_OAUTH_PROVIDER_ERROR,
    EAuthenticationErrorCodes.GITHUB_OAUTH_PROVIDER_ERROR,
    EAuthenticationErrorCodes.GITLAB_OAUTH_PROVIDER_ERROR,
    EAuthenticationErrorCodes.INVALID_PASSWORD_TOKEN,
    EAuthenticationErrorCodes.EXPIRED_PASSWORD_TOKEN,
    EAuthenticationErrorCodes.INCORRECT_OLD_PASSWORD,
    EAuthenticationErrorCodes.MISSING_PASSWORD,
    EAuthenticationErrorCodes.INVALID_NEW_PASSWORD,
    EAuthenticationErrorCodes.PASSWORD_ALREADY_SET,
    EAuthenticationErrorCodes.ADMIN_ALREADY_EXIST,
    EAuthenticationErrorCodes.REQUIRED_ADMIN_EMAIL_PASSWORD_FIRST_NAME,
    EAuthenticationErrorCodes.INVALID_ADMIN_EMAIL,
    EAuthenticationErrorCodes.INVALID_ADMIN_PASSWORD,
    EAuthenticationErrorCodes.REQUIRED_ADMIN_EMAIL_PASSWORD,
    EAuthenticationErrorCodes.ADMIN_AUTHENTICATION_FAILED,
    EAuthenticationErrorCodes.ADMIN_USER_ALREADY_EXIST,
    EAuthenticationErrorCodes.ADMIN_USER_DOES_NOT_EXIST,
    EAuthenticationErrorCodes.ADMIN_USER_DEACTIVATED,
    EAuthenticationErrorCodes.RATE_LIMIT_EXCEEDED,
    EAuthenticationErrorCodes.PASSWORD_TOO_WEAK,
  ];

  if (bannerAlertErrorCodes.includes(errorCode)) {
    const fallbackTitle = errorCodeMessages[errorCode]?.title || "Ошибка";
    const fallbackMessageNode = errorCodeMessages[errorCode]?.message(email) || "Что-то пошло не так. Попробуйте еще раз.";
    const fallbackMessage = typeof fallbackMessageNode === "string" ? fallbackMessageNode : "Что-то пошло не так. Попробуйте еще раз.";
    const i18nKeys = AUTH_ERROR_I18N_KEYS[errorCode];

    if (errorCode === EAuthenticationErrorCodes.USER_ALREADY_EXIST) {
      return {
        type: EErrorAlertType.BANNER_ALERT,
        code: errorCode,
        title: tt("auth.error_codes.user_already_exist.title", fallbackTitle),
        message: (
          <div>
            {tt("auth.error_codes.user_already_exist.message_prefix", "Ваша учетная запись уже зарегистрирована.")}&nbsp;
            <Link
              className="font-medium underline underline-offset-4 transition-all hover:font-bold"
              href={`/sign-in${email ? `?email=${encodeURIComponent(email)}` : ``}`}
            >
              {tt("auth.error_codes.common.sign_in_link", "Войти")}
            </Link>
            &nbsp;{tt("auth.error_codes.common.now_suffix", "сейчас.")}
          </div>
        ),
      };
    }

    if (errorCode === EAuthenticationErrorCodes.USER_DOES_NOT_EXIST) {
      return {
        type: EErrorAlertType.BANNER_ALERT,
        code: errorCode,
        title: tt("auth.error_codes.user_does_not_exist.title", fallbackTitle),
        message: (
          <div>
            {tt("auth.error_codes.user_does_not_exist.message_prefix", "Аккаунт не найден.")}&nbsp;
            <Link
              className="font-medium underline underline-offset-4 transition-all hover:font-bold"
              href={`/${email ? `?email=${encodeURIComponent(email)}` : ``}`}
            >
              {tt("auth.error_codes.user_does_not_exist.create_one_link", "Создать")}
            </Link>
            &nbsp;{tt("auth.error_codes.user_does_not_exist.message_suffix", "чтобы начать.")}
          </div>
        ),
      };
    }

    const title = i18nKeys ? tt(i18nKeys.title, fallbackTitle) : fallbackTitle;
    const message = i18nKeys
      ? tt(i18nKeys.message, fallbackMessage, { support_email: SUPPORT_EMAIL ? SUPPORT_EMAIL : "administrator" })
      : fallbackMessageNode;

    return {
      type: EErrorAlertType.BANNER_ALERT,
      code: errorCode,
      title,
      message,
    };
  }

  return undefined;
};

export const passwordErrors = [
  EAuthenticationErrorCodes.PASSWORD_TOO_WEAK,
  EAuthenticationErrorCodes.INVALID_NEW_PASSWORD,
];
