/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { Mark, markInputRule, markPasteRule, mergeAttributes } from "@tiptap/core";
// constants
import { CORE_EXTENSIONS } from "@/constants/extension";

const timecodePattern = "(?:\\d{2}:)?[0-5]\\d:[0-5]\\d";
const inputRegex = new RegExp(`(?:^|\\s)(${timecodePattern})$`);
const pasteRegex = new RegExp(`\\b${timecodePattern}\\b`, "g");
const exactTimecodeRegex = new RegExp(`^${timecodePattern}$`);

export const timecodeToSeconds = (value: string): number | null => {
  if (!exactTimecodeRegex.test(value)) return null;

  const parts = value.split(":").map(Number);
  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    return minutes * 60 + seconds;
  }

  const [hours, minutes, seconds] = parts;
  return hours * 60 * 60 + minutes * 60 + seconds;
};

export const TimecodeExtension = Mark.create({
  name: CORE_EXTENSIONS.TIMECODE,

  excludes: "code link",

  addOptions() {
    return {
      HTMLAttributes: {
        class:
          "inline-flex rounded-sm border border-accent-primary/30 bg-accent-primary/10 px-1 font-code text-[0.85em] font-medium text-accent-primary",
      },
    };
  },

  addAttributes() {
    return {
      timecode: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const value = element.getAttribute("data-plane-timecode");
          return value && timecodeToSeconds(value) !== null ? value : null;
        },
        renderHTML: (attributes: { timecode: string | null }) =>
          attributes.timecode ? { "data-plane-timecode": attributes.timecode } : {},
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-plane-timecode]",
        getAttrs: (node) => {
          if (!(node instanceof HTMLElement)) return false;
          return timecodeToSeconds(node.getAttribute("data-plane-timecode") ?? "") !== null ? null : false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  addInputRules() {
    return [
      markInputRule({
        find: inputRegex,
        type: this.type,
        getAttributes: (match) => ({ timecode: match[1] }),
      }),
    ];
  },

  addPasteRules() {
    return [
      markPasteRule({
        find: pasteRegex,
        type: this.type,
        getAttributes: (match) => ({ timecode: match[0] }),
      }),
    ];
  },
});
