/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { startTransition, StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";

type ReactRouterWindow = Window & {
  __reactRouterContext?: {
    isSpaMode?: boolean;
    ssr?: boolean;
  };
};

startTransition(() => {
  const app = (
    <StrictMode>
      <HydratedRouter />
    </StrictMode>
  );

  const routerContext = (window as ReactRouterWindow).__reactRouterContext;

  if (routerContext?.isSpaMode && routerContext.ssr === false) {
    document.body.replaceChildren();
    createRoot(document).render(app);
    return;
  }

  hydrateRoot(document, app);
});
