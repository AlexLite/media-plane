/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect, useState } from "react";

type TPlatformOS = {
  isMobile: boolean;
  platform: string;
};

const getPlatformOS = (): TPlatformOS => {
  if (typeof window === "undefined") {
    return { isMobile: false, platform: "" };
  }

  const userAgent = window.navigator.userAgent;
  const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent);
  let platform = "";

  if (!isMobile) {
    if (userAgent.indexOf("Win") !== -1) {
      platform = "Windows";
    } else if (userAgent.indexOf("Mac") !== -1) {
      platform = "MacOS";
    } else if (userAgent.indexOf("Linux") !== -1) {
      platform = "Linux";
    } else {
      platform = "Unknown";
    }
  }

  return { isMobile, platform };
};

export const usePlatformOS = () => {
  const [platformInfo, setPlatformInfo] = useState<TPlatformOS>({ isMobile: false, platform: "" });

  useEffect(() => {
    setPlatformInfo(getPlatformOS());
  }, []);

  return platformInfo;
};
