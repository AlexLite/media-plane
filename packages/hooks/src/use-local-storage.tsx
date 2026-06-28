/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useState, useEffect, useCallback } from "react";

const isBrowser = () => typeof window !== "undefined";

export const getValueFromLocalStorage = (key: string, defaultValue: any) => {
  if (!isBrowser()) return defaultValue;
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (_error) {
    window.localStorage.removeItem(key);
    return defaultValue;
  }
};

export const setValueIntoLocalStorage = (key: string, value: any) => {
  if (!isBrowser()) return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (_error) {
    return false;
  }
};

export const useLocalStorage = <T,>(key: string, initialValue: T) => {
  // Keep the first render SSR-safe. Hydrate from localStorage only after mount.
  const [storedValue, setStoredValue] = useState<T | null>(initialValue);

  const setValue = useCallback(
    (value: T) => {
      if (!isBrowser()) return;
      window.localStorage.setItem(key, JSON.stringify(value));
      setStoredValue(value);
      window.dispatchEvent(new Event(`local-storage:${key}`));
    },
    [key]
  );

  const clearValue = useCallback(() => {
    if (!isBrowser()) return;
    window.localStorage.removeItem(key);
    setStoredValue(null);
    window.dispatchEvent(new Event(`local-storage:${key}`));
  }, [key]);

  const reHydrate = useCallback(() => {
    const data = getValueFromLocalStorage(key, initialValue);
    setStoredValue(data);
  }, [key, initialValue]);

  useEffect(() => {
    setStoredValue(getValueFromLocalStorage(key, initialValue));
    window.addEventListener(`local-storage:${key}`, reHydrate);
    return () => {
      window.removeEventListener(`local-storage:${key}`, reHydrate);
    };
  }, [key, reHydrate]);

  return { storedValue, setValue, clearValue } as const;
};
