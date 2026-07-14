/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { IntlMessageFormat } from "intl-messageformat";
import { get, merge } from "lodash-es";
import { makeAutoObservable, runInAction } from "mobx";
// constants
import { FALLBACK_LANGUAGE, SUPPORTED_LANGUAGES, LANGUAGE_STORAGE_KEY } from "../constants";
import { NAMESPACES } from "../constants/namespaces";
import enAccessibility from "../locales/en/accessibility.json";
import enAuth from "../locales/en/auth.json";
import enAutomation from "../locales/en/automation.json";
import enCommon from "../locales/en/common.json";
import enCompat from "../locales/en/compat.json";
import enCycle from "../locales/en/cycle.json";
import enEditor from "../locales/en/editor.json";
import enEmptyState from "../locales/en/empty-state.json";
import enHome from "../locales/en/home.json";
import enInbox from "../locales/en/inbox.json";
import enIntegration from "../locales/en/integration.json";
import enModule from "../locales/en/module.json";
import enNavigation from "../locales/en/navigation.json";
import enNotification from "../locales/en/notification.json";
import enPage from "../locales/en/page.json";
import enPowerK from "../locales/en/power-k.json";
import enProject from "../locales/en/project.json";
import enProjectSettings from "../locales/en/project-settings.json";
import enSettings from "../locales/en/settings.json";
import enStickies from "../locales/en/stickies.json";
import enTemplate from "../locales/en/template.json";
import enTour from "../locales/en/tour.json";
import enUpdate from "../locales/en/update.json";
import enWiki from "../locales/en/wiki.json";
import enWorkItem from "../locales/en/work-item.json";
import enWorkItemType from "../locales/en/work-item-type.json";
import enWorkflow from "../locales/en/workflow.json";
import enWorkspace from "../locales/en/workspace.json";
import enWorkspaceSettings from "../locales/en/workspace-settings.json";
import ruAccessibility from "../locales/ru/accessibility.json";
import ruAuth from "../locales/ru/auth.json";
import ruAutomation from "../locales/ru/automation.json";
import ruCommon from "../locales/ru/common.json";
import ruCompat from "../locales/ru/compat.json";
import ruCycle from "../locales/ru/cycle.json";
import ruEditor from "../locales/ru/editor.json";
import ruEmptyState from "../locales/ru/empty-state.json";
import ruHome from "../locales/ru/home.json";
import ruInbox from "../locales/ru/inbox.json";
import ruIntegration from "../locales/ru/integration.json";
import ruModule from "../locales/ru/module.json";
import ruNavigation from "../locales/ru/navigation.json";
import ruNotification from "../locales/ru/notification.json";
import ruPage from "../locales/ru/page.json";
import ruPowerK from "../locales/ru/power-k.json";
import ruProject from "../locales/ru/project.json";
import ruProjectSettings from "../locales/ru/project-settings.json";
import ruSettings from "../locales/ru/settings.json";
import ruStickies from "../locales/ru/stickies.json";
import ruTemplate from "../locales/ru/template.json";
import ruTour from "../locales/ru/tour.json";
import ruUpdate from "../locales/ru/update.json";
import ruWiki from "../locales/ru/wiki.json";
import ruWorkItem from "../locales/ru/work-item.json";
import ruWorkItemType from "../locales/ru/work-item-type.json";
import ruWorkflow from "../locales/ru/workflow.json";
import ruWorkspace from "../locales/ru/workspace.json";
import ruWorkspaceSettings from "../locales/ru/workspace-settings.json";
// types
import type { TLanguage, ILanguageOption, ITranslations } from "../types";

const enCore = merge(
  {},
  enAccessibility,
  enAuth,
  enAutomation,
  enCommon,
  enCompat,
  enCycle,
  enEditor,
  enEmptyState,
  enHome,
  enInbox,
  enIntegration,
  enModule,
  enNavigation,
  enNotification,
  enPage,
  enPowerK,
  enProject,
  enProjectSettings,
  enSettings,
  enStickies,
  enTemplate,
  enTour,
  enUpdate,
  enWiki,
  enWorkItem,
  enWorkItemType,
  enWorkflow,
  enWorkspace,
  enWorkspaceSettings
);

const ruCore = merge(
  {},
  ruAccessibility,
  ruAuth,
  ruAutomation,
  ruCommon,
  ruCompat,
  ruCycle,
  ruEditor,
  ruEmptyState,
  ruHome,
  ruInbox,
  ruIntegration,
  ruModule,
  ruNavigation,
  ruNotification,
  ruPage,
  ruPowerK,
  ruProject,
  ruProjectSettings,
  ruSettings,
  ruStickies,
  ruTemplate,
  ruTour,
  ruUpdate,
  ruWiki,
  ruWorkItem,
  ruWorkItemType,
  ruWorkflow,
  ruWorkspace,
  ruWorkspaceSettings
);

const getDefaultLanguage = (): TLanguage => {
  const envLocale = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
    ?.VITE_DEFAULT_LANGUAGE;
  if (envLocale && SUPPORTED_LANGUAGES.some((lang) => lang.value === envLocale)) {
    return envLocale as TLanguage;
  }

  return FALLBACK_LANGUAGE;
};

/**
 * Mobx store class for handling translations and language changes in the application
 * Provides methods to translate keys with params and change the language
 * Uses IntlMessageFormat to format the translations
 */
export class TranslationStore {
  // Core translations that are always loaded
  private coreTranslations: ITranslations = {
    en: enCore,
    ru: ruCore,
  };
  // List of translations for each language
  private translations: ITranslations = {};
  // Cache for IntlMessageFormat instances
  private messageCache: Map<string, IntlMessageFormat> = new Map();
  private missingKeyWarnings = new Set<string>();
  // Current language
  currentLocale: TLanguage = getDefaultLanguage();
  // Loading state
  isLoading: boolean = true;
  isInitialized: boolean = false;
  // Set of loaded languages
  private loadedLanguages: Set<TLanguage> = new Set();

  /**
   * Constructor for the TranslationStore class
   */
  constructor() {
    makeAutoObservable(this);
    // Initialize with core translations immediately
    this.translations = this.coreTranslations;
    (Object.keys(this.coreTranslations) as TLanguage[]).forEach((language) => this.loadedLanguages.add(language));
    // Initialize language
    this.initializeLanguage();
    // Load all the translations
    this.loadTranslations();
  }

  /** Initializes the language based on the local storage or browser language */
  private initializeLanguage() {
    if (typeof window === "undefined") return;

    const defaultLanguage = getDefaultLanguage();
    // If build-time default locale is explicitly configured (e.g. ru),
    // keep startup language deterministic between SSR and hydration.
    if (defaultLanguage !== FALLBACK_LANGUAGE) {
      this.setLanguage(defaultLanguage);
      return;
    }

    const savedLocale = localStorage.getItem(LANGUAGE_STORAGE_KEY) as TLanguage;
    if (this.isValidLanguage(savedLocale)) {
      this.setLanguage(savedLocale);
      return;
    }

    // Fallback to default language
    this.setLanguage(defaultLanguage);
  }

  /** Loads the translations for the current language */
  private async loadTranslations(): Promise<void> {
    try {
      // Core translations are available immediately; don't block route rendering
      // while language namespace chunks are still loading.
      runInAction(() => {
        this.isInitialized = true;
      });
      // Load current and fallback languages in parallel
      await this.loadPrimaryLanguages();
    } catch (error) {
      console.error("Failed in translation initialization:", error);
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  private async loadPrimaryLanguages(): Promise<void> {
    try {
      // Load current and fallback languages in parallel
      const languagesToLoad = new Set<TLanguage>([this.currentLocale]);
      // Add fallback language only if different from current
      if (this.currentLocale !== FALLBACK_LANGUAGE) {
        languagesToLoad.add(FALLBACK_LANGUAGE);
      }
      // Load all primary languages in parallel
      const loadPromises = Array.from(languagesToLoad).map((lang) => this.loadLanguageTranslations(lang));
      await Promise.all(loadPromises);
      // Update loading state
      runInAction(() => {
        this.isLoading = false;
      });
    } catch (error) {
      console.error("Failed to load primary languages:", error);
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  private async loadLanguageTranslations(language: TLanguage): Promise<void> {
    // Skip if already loaded
    if (this.loadedLanguages.has(language)) return;

    try {
      const translations = await this.importLanguageFile(language);
      runInAction(() => {
        // Use lodash merge for deep merging
        this.translations[language] = merge({}, this.coreTranslations[language] || {}, translations.default);
        // Add to loaded languages
        this.loadedLanguages.add(language);
        // Clear cache
        this.messageCache.clear();
      });
    } catch (error) {
      console.error(`Failed to load translations for ${language}:`, error);
    }
  }

  /**
   * Helper function to import and merge multiple translation files for a language
   * @param language - The language code
   * @param files - Array of file names to import (without .json extension)
   * @returns Promise that resolves to merged translations
   */
  private async importAndMergeFiles(language: TLanguage, files: string[]) {
    const modules = await Promise.all(
      files.map((file) =>
        import(`../locales/${language}/${file}.json`).catch((error: unknown) => {
          console.warn(`Skipping missing translation namespace ${language}/${file}:`, error);
          return { default: {} };
        })
      )
    );
    const merged = modules.reduce((acc: any, module: any) => merge(acc, module.default), {});
    return { default: merged };
  }

  /**
   * Imports the translations for the given language
   * @param language - The language to import the translations for
   * @returns {Promise<any>}
   */
  private async importLanguageFile(language: TLanguage) {
    const files = [...NAMESPACES];
    return this.importAndMergeFiles(language, files);
  }

  /** Checks if the language is valid based on the supported languages */
  private isValidLanguage(lang: string | null): lang is TLanguage {
    return lang !== null && this.availableLanguages.some((l) => l.value === lang);
  }

  /**
   * Gets the cache key for the given key and locale
   * @param key - the key to get the cache key for
   * @param locale - the locale to get the cache key for
   * @returns the cache key for the given key and locale
   */
  private getCacheKey(key: string, locale: TLanguage): string {
    return `${locale}:${key}`;
  }

  /**
   * Gets the IntlMessageFormat instance for the given key and locale
   * Returns cached instance if available
   */
  private getMessageInstance(key: string, locale: TLanguage): IntlMessageFormat | null {
    const cacheKey = this.getCacheKey(key, locale);

    // Check if the cache already has the key
    if (this.messageCache.has(cacheKey)) {
      return this.messageCache.get(cacheKey) || null;
    }

    // Get the message from the translations
    const message = get(this.translations[locale], key);
    if (typeof message !== "string") return null;

    try {
      const formatter = new IntlMessageFormat(message, locale);
      this.messageCache.set(cacheKey, formatter);
      return formatter;
    } catch (error) {
      console.error(`Failed to create message formatter for key "${key}":`, error);
      return null;
    }
  }

  /**
   * Translates a key with params using the current locale
   * Falls back to the default language if the translation is not found
   * Returns the key itself if the translation is not found
   * @param key - The key to translate
   * @param params - The params to format the translation with
   * @returns The translated string
   */
  t(key: string, params?: Record<string, unknown>): string {
    try {
      // Try current locale
      let formatter = this.getMessageInstance(key, this.currentLocale);

      // Fallback to default language if necessary
      if (!formatter && this.currentLocale !== FALLBACK_LANGUAGE) {
        formatter = this.getMessageInstance(key, FALLBACK_LANGUAGE);
      }

      // If we have a formatter, use it
      if (formatter) {
        return formatter.format(params || {}) as string;
      }

      // Last resort: return the key itself
      this.warnAboutMissingKey(key);
      return key;
    } catch (error) {
      console.error(`Translation error for key "${key}":`, error);
      return key;
    }
  }

  hasTranslation(key: string): boolean {
    return Boolean(
      this.getMessageInstance(key, this.currentLocale) ||
      (this.currentLocale !== FALLBACK_LANGUAGE && this.getMessageInstance(key, FALLBACK_LANGUAGE))
    );
  }

  private warnAboutMissingKey(key: string): void {
    const warningKey = `${this.currentLocale}:${key}`;
    if (this.missingKeyWarnings.has(warningKey)) return;

    this.missingKeyWarnings.add(warningKey);
    console.error(
      `Missing runtime translation key "${key}" for locale "${this.currentLocale}". ` +
        "Add it to a loaded JSON namespace and keep the RU key synchronized with EN."
    );
  }

  /**
   * Sets the current language and updates the translations
   * @param lng - The new language
   */
  async setLanguage(lng: TLanguage): Promise<void> {
    try {
      if (!this.isValidLanguage(lng)) {
        throw new Error(`Invalid language: ${lng}`);
      }

      // Safeguard in case background loading failed
      if (!this.loadedLanguages.has(lng)) {
        await this.loadLanguageTranslations(lng);
      }

      if (typeof window !== "undefined") {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, lng);
        document.documentElement.lang = lng;
      }

      runInAction(() => {
        this.currentLocale = lng;
        this.messageCache.clear(); // Clear cache when language changes
      });
    } catch (error) {
      console.error("Failed to set language:", error);
    }
  }

  /**
   * Gets the available language options for the dropdown
   * @returns An array of language options
   */
  get availableLanguages(): ILanguageOption[] {
    return SUPPORTED_LANGUAGES;
  }
}

export const translationStore = new TranslationStore();

export const translate = (key: string, params?: Record<string, unknown>): string => translationStore.t(key, params);
export const hasTranslation = (key: string): boolean => translationStore.hasTranslation(key);
