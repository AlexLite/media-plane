/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

export const getLegacyArchiveInMonths = (archiveInDays: number) => Math.min(12, Math.ceil(archiveInDays / 30));
