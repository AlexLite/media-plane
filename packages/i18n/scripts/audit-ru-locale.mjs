#!/usr/bin/env node
/**
 * Quick RU locale audit helper.
 *
 * Checks:
 * 1) Values with likely untranslated English in ru JSON namespace files.
 * 2) Optional: compare with an override file and show phrases still found in RU values.
 *
 * Usage:
 *   node packages/i18n/scripts/audit-ru-locale.mjs
 *   node packages/i18n/scripts/audit-ru-locale.mjs --override E:/Dev/projects/Plane/ru-override.utf8.js
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const cwd = process.cwd();
const repoRoot = cwd.endsWith(path.join("packages", "i18n")) ? path.resolve(cwd, "..", "..") : cwd;
const ruDir = path.join(repoRoot, "packages", "i18n", "src", "locales", "ru");

const intentionallyIdenticalKeys = new Set([
  "auth.json:sso.domain_management.verified_domains.add_domain.form.domain_placeholder",
  "auth.json:sso.providers.saml.setup_modal.mapping_table.table.idp",
  "auth.json:sso.providers.saml.setup_modal.mapping_table.table.plane",
  "auth.json:auth.common.email.label",
  "automation.json:automations.trigger.schedule.am",
  "automation.json:automations.trigger.schedule.pm",
  "automation.json:automations.trigger.schedule.schedule_mode_cron",
  "automation.json:automations.trigger.schedule.main_content_cron_summary",
  "common.json:ok",
  "common.json:email",
  "common.json:exporter.excel.title",
  "common.json:exporter.xlsx.title",
  "common.json:exporter.json.title",
  "integration.json:github_integration.name",
  "integration.json:gitlab_integration.name",
  "integration.json:gitlab_enterprise_integration.name",
  "integration.json:slack_integration.name",
  "integration.json:sentry_integration.name",
  "integration.json:bitbucket_dc_integration.name",
  "integration.json:oauth_bridge_integration.name",
  "integration.json:oauth_bridge_integration.provider_form.audience_placeholder",
  "integration.json:oauth_bridge_integration.provider_form.user_claims_placeholder",
  "integration.json:oauth_bridge_integration.provider_form.rate_limit_placeholder",
  "integration.json:github_enterprise_integration.name",
  "integration.json:github_enterprise_integration.app_id_placeholder",
  "integration.json:github_enterprise_integration.app_name_placeholder",
  "integration.json:github_enterprise_integration.client_id_placeholder",
  "integration.json:github_enterprise_integration.client_secret_placeholder",
  "integration.json:github_enterprise_integration.webhook_secret_placeholder",
  "integration.json:github_enterprise_integration.private_key_placeholder",
  "navigation.json:sidebar.pro",
  "project.json:project_members.email",
  "template.json:templates.settings.form.publish.company_name.placeholder",
  "template.json:templates.settings.form.publish.contact_email.placeholder",
  "workspace-settings.json:workspace_settings.settings.members.details.email_address",
  "workspace-settings.json:workspace_settings.settings.plane-intelligence.title",
  "workspace-settings.json:workspace_settings.settings.plane-intelligence.heading",
  "workspace-settings.json:workspace_settings.settings.runners.title",
]);

const args = process.argv.slice(2);
const overrideIndex = args.indexOf("--override");
const overridePath = overrideIndex >= 0 ? args[overrideIndex + 1] : null;

const cyrillicRe = /[А-Яа-яЁё]/;
const latinRe = /[A-Za-z]/;

const ignoredLineSubstrings = ["http://", "https://", "API", "URL", "ID", "CSV", "HEX", "{email}", "name@company.com"];

const decodeEscapes = (s) => {
  try {
    return JSON.parse(`"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`);
  } catch {
    return s;
  }
};

const shouldIgnoreText = (text) => {
  if (!text) return true;
  if (!latinRe.test(text)) return true;
  if (cyrillicRe.test(text)) return true;
  if (text.length <= 1) return true;
  if (/^[a-z0-9_.-]+$/i.test(text) && /[_-]/.test(text)) return true;
  return ignoredLineSubstrings.some((x) => text.includes(x));
};

const flattenValues = (obj, prefix = "") => {
  const results = [];
  for (const [key, value] of Object.entries(obj)) {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      results.push(...flattenValues(value, nextKey));
    } else if (typeof value === "string") {
      results.push({ key: nextKey, value });
    }
  }
  return results;
};

const listRuFiles = () =>
  fs
    .readdirSync(ruDir)
    .filter((file) => file.endsWith(".json"))
    .sort();

const collectRuCandidates = () => {
  const results = [];
  for (const file of listRuFiles()) {
    const filePath = path.join(ruDir, file);
    const values = flattenValues(JSON.parse(fs.readFileSync(filePath, "utf8")));
    for (const { key, value } of values) {
      if (!intentionallyIdenticalKeys.has(`${file}:${key}`) && !shouldIgnoreText(value)) {
        results.push({ file, key, value });
      }
    }
  }
  return results;
};

const parseOverrideMap = (content) => {
  const pairs = [];

  const skipWhitespace = (index) => {
    while (index < content.length && /\s/.test(content[index])) index += 1;
    return index;
  };

  const readQuotedString = (index) => {
    if (content[index] !== '"') return null;

    let value = "";
    let escaped = false;
    for (let i = index + 1; i < content.length; i += 1) {
      const char = content[i];
      if (escaped) {
        value += `\\${char}`;
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        return { value: decodeEscapes(value), nextIndex: i + 1 };
      } else {
        value += char;
      }
    }

    return null;
  };

  for (let i = 0; i < content.length; i += 1) {
    if (content[i] !== "[") continue;

    let cursor = skipWhitespace(i + 1);
    const en = readQuotedString(cursor);
    if (!en) continue;

    cursor = skipWhitespace(en.nextIndex);
    if (content[cursor] !== ",") continue;

    cursor = skipWhitespace(cursor + 1);
    const ru = readQuotedString(cursor);
    if (!ru) continue;

    cursor = skipWhitespace(ru.nextIndex);
    if (content[cursor] !== "]") continue;

    pairs.push({ en: en.value, ru: ru.value });
    i = cursor;
  }

  return pairs;
};

const main = () => {
  if (!fs.existsSync(ruDir)) {
    console.error(`RU locales directory not found: ${ruDir}`);
    process.exit(1);
  }

  const ruFiles = listRuFiles();
  const untranslated = collectRuCandidates();
  console.log("== RU locale audit ==");
  console.log(`Files: ${ruFiles.join(", ")}`);
  console.log(`Potential untranslated values: ${untranslated.length}`);
  untranslated.slice(0, 200).forEach((it) => {
    console.log(`${it.file}:${it.key} -> ${it.value}`);
  });
  if (untranslated.length > 200) {
    console.log(`... and ${untranslated.length - 200} more`);
  }

  if (overridePath) {
    if (!fs.existsSync(overridePath)) {
      console.error(`Override file not found: ${overridePath}`);
      process.exit(1);
    }

    const overrideContent = fs.readFileSync(overridePath, "utf8");
    const pairs = parseOverrideMap(overrideContent);
    const ruText = ruFiles.map((f) => fs.readFileSync(path.join(ruDir, f), "utf8")).join("\n");
    const stillPresent = pairs.filter(({ en }) => ruText.includes(`"${en}"`));

    console.log("");
    console.log(`== Override cross-check (${path.basename(overridePath)}) ==`);
    console.log(`Map pairs in override: ${pairs.length}`);
    console.log(`EN phrases still present in RU locale files: ${stillPresent.length}`);
    stillPresent.slice(0, 200).forEach((p) => {
      console.log(`- ${p.en} => ${p.ru}`);
    });
    if (stillPresent.length > 200) {
      console.log(`... and ${stillPresent.length - 200} more`);
    }
  }
};

main();
