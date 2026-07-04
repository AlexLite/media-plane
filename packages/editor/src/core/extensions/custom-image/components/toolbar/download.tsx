/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { Download } from "lucide-react";
// plane imports
import { useTranslation } from "@plane/i18n";
import { Tooltip } from "@plane/propel/tooltip";

type Props = {
  src: string;
};

export function ImageDownloadAction(props: Props) {
  const { src } = props;
  const { t } = useTranslation();

  return (
    <Tooltip tooltipContent={t("editor.image_toolbar.download")}>
      <button
        type="button"
        onClick={() => window.open(src, "_blank")}
        className="grid h-full flex-shrink-0 place-items-center text-white/60 transition-colors hover:text-white"
        aria-label={t("editor.image_toolbar.download_image")}
      >
        <Download className="size-3" />
      </button>
    </Tooltip>
  );
}
