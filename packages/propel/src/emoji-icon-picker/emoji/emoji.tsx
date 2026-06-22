/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect, useRef } from "react";
import { EmojiPicker } from "frimousse";
import { translate } from "@plane/i18n";
import { cn } from "../../utils";

type EmojiRootProps = {
  onChange: (value: string) => void;
  searchPlaceholder?: string;
  searchDisabled?: boolean;
};

const EMOJI_CATEGORY_TRANSLATION_KEYS: Record<string, string> = {
  "smileys & emotion": "emoji_picker.categories.smileys_and_emotion",
  "people & body": "emoji_picker.categories.people_and_body",
  "animals & nature": "emoji_picker.categories.animals_and_nature",
  "food & drink": "emoji_picker.categories.food_and_drink",
  "travel & places": "emoji_picker.categories.travel_and_places",
  activities: "emoji_picker.categories.activities",
  objects: "emoji_picker.categories.objects",
  symbols: "emoji_picker.categories.symbols",
  flags: "emoji_picker.categories.flags",
};

const translateEmojiCategory = (label: string): string => {
  const key = EMOJI_CATEGORY_TRANSLATION_KEYS[label.toLowerCase()];
  return key ? translate(key) : label;
};

export function EmojiRoot(props: EmojiRootProps) {
  const { onChange, searchPlaceholder = translate("search"), searchDisabled = false } = props;
  const searchWrapperRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const focusInput = () => {
      const searchWrapper = searchWrapperRef.current;
      if (searchWrapper) {
        const inputElement = searchWrapper.querySelector("input");
        if (inputElement) {
          inputElement.removeAttribute("disabled");
          inputElement.focus();
        }
      }
    };
    focusInput();
  }, []);

  return (
    <EmojiPicker.Root
      data-slot="emoji-picker"
      className="isolate flex h-full w-full flex-col rounded-md border-none p-2"
      onEmojiSelect={(val) => onChange(val.emoji)}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 bg-surface-1 px-1.5 py-2 [&>[data-slot='emoji-picker-search-wrapper']]:flex-grow [&>[data-slot='emoji-picker-search-wrapper']]:p-0">
        <div ref={searchWrapperRef} data-slot="emoji-picker-search-wrapper" className="p-2">
          <EmojiPicker.Search
            placeholder={searchPlaceholder}
            disabled={searchDisabled}
            className="block h-full w-full flex-grow-0 rounded-md border-[0.5px] border-subtle bg-transparent p-0 px-3 py-2 text-16 placeholder-(--text-color-placeholder) focus:border-accent-strong focus:outline-none"
          />
        </div>
        <EmojiPicker.SkinToneSelector
          data-slot="emoji-picker-skin-tone-selector"
          className="hover:bg-accent mx-2 mb-1.5 size-8 flex-shrink-0 rounded-md bg-surface-1 text-16"
        />
      </div>
      <EmojiPicker.Viewport data-slot="emoji-picker-content" className={cn("relative flex-1 outline-none")}>
        <EmojiPicker.List
          data-slot="emoji-picker-list"
          className={cn("pb-2 select-none")}
          components={{
            CategoryHeader: ({ category, ...props }) => (
              <div
                data-slot="emoji-picker-list-category-header"
                className="bg-surface-1 px-3 pb-1.5 text-11 font-medium text-tertiary"
                {...props}
              >
                {translateEmojiCategory(category.label)}
              </div>
            ),
            Row: ({ children, ...props }) => (
              <div data-slot="emoji-picker-list-row" className="scroll-my-1.5 px-1.5" {...props}>
                {children}
              </div>
            ),
            Emoji: ({ emoji, ...props }) => (
              <button
                type="button"
                aria-label={emoji?.label ?? emoji?.emoji}
                data-slot="emoji-picker-list-emoji"
                className="data-active:bg-accent flex size-8 items-center justify-center rounded-md text-16"
                {...props}
              >
                {emoji.emoji}
              </button>
            ),
          }}
        />
      </EmojiPicker.Viewport>
    </EmojiPicker.Root>
  );
}
