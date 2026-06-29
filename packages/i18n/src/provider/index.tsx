/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import React, { useEffect, useState } from "react";
import { I18nextProvider } from "react-i18next";
import { i18nInstance, initPromise } from "../core";

interface TranslationProviderProps {
  children: React.ReactNode;
}

export const TranslationProvider: React.FC<TranslationProviderProps> = ({ children }) => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    initPromise
      .then(() => {
        if (isMounted) setIsReady(true);
      })
      .catch((err: unknown) => {
        console.error("Failed to initialize i18n:", err);
        if (isMounted) setIsReady(true);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (!isReady) return null;
  return <I18nextProvider i18n={i18nInstance}>{children}</I18nextProvider>;
};
