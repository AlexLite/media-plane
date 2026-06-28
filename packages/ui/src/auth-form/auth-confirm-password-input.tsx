/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import React, { useState } from "react";
import { useTranslation } from "@plane/i18n";
import { cn } from "@plane/utils";
import { AuthInput } from "./auth-input";

export type TAuthConfirmPasswordInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  password: string;
  label?: string;
  error?: string;
  showPasswordToggle?: boolean;
  containerClassName?: string;
  labelClassName?: string;
  errorClassName?: string;
  onPasswordMatchChange?: (matches: boolean) => void;
};

export function AuthConfirmPasswordInput({
  password,
  label,
  error,
  showPasswordToggle = true,
  containerClassName = "",
  errorClassName = "",
  className = "",
  value = "",
  onChange,
  onPasswordMatchChange,
  ...props
}: TAuthConfirmPasswordInputProps) {
  const { t } = useTranslation();
  const [isFocused, setIsFocused] = useState(false);

  const confirmPassword = value as string;
  const passwordsMatch = password === confirmPassword && password.length > 0;
  const showMatchError =
    confirmPassword.length > 0 && !passwordsMatch && (!isFocused || confirmPassword.length >= password.length);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newConfirmPassword = e.target.value;
    onChange?.(e);
    onPasswordMatchChange?.(password === newConfirmPassword && password.length > 0);
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const getError = () => {
    if (error) return error;
    if (showMatchError) return t("auth.common.password.errors.match");
    return "";
  };

  return (
    <div className={cn("space-y-2", containerClassName)}>
      <AuthInput
        {...props}
        type="password"
        label={label ?? t("auth.common.password.confirm_password.label")}
        error={getError()}
        showPasswordToggle={showPasswordToggle}
        errorClassName={errorClassName}
        className={className}
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        autoComplete="off"
      />
      {confirmPassword && passwordsMatch && (
        <p className="text-13 text-success-primary">{t("auth.common.password.match_success")}</p>
      )}
    </div>
  );
}
