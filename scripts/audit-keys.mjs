#!/usr/bin/env node
/**
 * Plane RU Translation Audit Script
 * Compares EN vs RU translation keys across runtime JSON namespaces.
 *
 * Usage: node scripts/audit-keys.mjs [--missing] [--untranslated] [--extra]
 *   --missing       show keys in EN but absent in RU
 *   --untranslated  show keys where RU value == EN value (possibly forgot to translate)
 *   --extra         show keys in RU but not in EN (orphaned)
 *   (no flags = show all)
 */

import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const LOCALES_DIR = join(ROOT, "packages/i18n/src/locales");
const NAMESPACES_FILE = join(ROOT, "packages/i18n/src/constants/namespaces.ts");

function loadNamespaces() {
  const content = readFileSync(NAMESPACES_FILE, "utf-8");
  const match = content.match(/export const NAMESPACES = \[([\s\S]*?)\] as const;/);
  if (!match) {
    throw new Error(`Failed to parse namespace list from ${NAMESPACES_FILE}`);
  }

  return [...match[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

const NAMESPACES = loadNamespaces();

// Technical terms that are intentionally identical in both locales.
const TECHNICAL_TERMS = new Set([
  "PDF",
  "Markdown",
  "JSON",
  "CSV",
  "XML",
  "HTML",
  "API",
  "URL",
  "A4",
  "A3",
  "A2",
  "Letter",
  "Legal",
  "Tabloid",
  "Jira",
  "GitHub",
  "GitLab",
  "Gitea",
  "Slack",
  "Discord",
  "Google",
  "OAuth",
  "SAML",
  "SSO",
  "SMTP",
  "LDAP",
  "Excel",
  "HR",
  "OK",
  "AI",
  "LLM",
]);

// Patterns for values that don't need translation (slugs, identifiers, codes).
const SLUG_PATTERN = /^[a-z][a-z0-9-]*$/;
const ACRONYM_PATTERN = /^[A-Z0-9\s\-_.\\/]+$/;

function isTechnical(val) {
  if (TECHNICAL_TERMS.has(val)) return true;
  if (SLUG_PATTERN.test(val)) return true;
  if (ACRONYM_PATTERN.test(val)) return true;
  return false;
}

function loadLocale(lang, ns) {
  const filePath = join(LOCALES_DIR, lang, `${ns}.json`);
  if (!existsSync(filePath)) return {};

  try {
    return JSON.parse(readFileSync(filePath, "utf-8"));
  } catch (e) {
    console.error(`  Failed to parse ${lang}/${ns}.json: ${e.message}`);
    return {};
  }
}

function flatKeys(obj, prefix = "") {
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      Object.assign(result, flatKeys(v, key));
    } else {
      result[key] = typeof v === "string" ? v : String(v ?? "");
    }
  }
  return result;
}

const enAll = {};
const ruAll = {};

for (const ns of NAMESPACES) {
  const enFlat = flatKeys(loadLocale("en", ns));
  const ruFlat = flatKeys(loadLocale("ru", ns));
  for (const [k, v] of Object.entries(enFlat)) enAll[`${ns}:${k}`] = v;
  for (const [k, v] of Object.entries(ruFlat)) ruAll[`${ns}:${k}`] = v;
}

const missing = [];
const untranslated = [];
const extra = [];

for (const [key, enVal] of Object.entries(enAll)) {
  if (!(key in ruAll)) {
    missing.push({ key, enVal });
  } else if (ruAll[key] === enVal && !isTechnical(enVal)) {
    untranslated.push({ key, val: enVal });
  }
}

for (const key of Object.keys(ruAll)) {
  if (!(key in enAll)) extra.push(key);
}

const args = process.argv.slice(2);
const showAll = args.length === 0;
const showMissing = showAll || args.includes("--missing");
const showUntranslated = showAll || args.includes("--untranslated");
const showExtra = showAll || args.includes("--extra");

const hr = "-".repeat(60);
const hr2 = "=".repeat(60);

console.log(`\n${hr2}`);
console.log(`PLANE RU TRANSLATION AUDIT - ${new Date().toISOString().slice(0, 10)}`);
console.log(hr2);
console.log(`\n  Namespaces    : ${NAMESPACES.length}`);
console.log(`  EN keys total : ${Object.keys(enAll).length}`);
console.log(`  RU keys total : ${Object.keys(ruAll).length}`);
console.log(`  Missing in RU : ${missing.length}  ${missing.length === 0 ? "OK" : "FAIL"}`);
console.log(`  Untranslated  : ${untranslated.length}  ${untranslated.length === 0 ? "OK" : "WARN"}`);
console.log(`  Orphaned in RU: ${extra.length}  ${extra.length === 0 ? "OK" : "WARN"}`);

if (showMissing && missing.length > 0) {
  console.log(`\n${hr}`);
  console.log("MISSING IN RU - add these keys to the matching ru/*.json namespace:");
  console.log(hr);
  for (const { key, enVal } of missing) {
    console.log(`  ${key}`);
    console.log(`    EN: "${enVal}"`);
  }
}

if (showUntranslated && untranslated.length > 0) {
  console.log(`\n${hr}`);
  console.log("POSSIBLY UNTRANSLATED - RU value identical to EN (review these):");
  console.log(hr);
  for (const { key, val } of untranslated) {
    console.log(`  ${key}: "${val}"`);
  }
}

if (showExtra && extra.length > 0) {
  console.log(`\n${hr}`);
  console.log("ORPHANED IN RU - key removed from EN, consider cleaning up:");
  console.log(hr);
  for (const key of extra) console.log(`  ${key}`);
}

console.log(`\n${hr2}\n`);

if (missing.length > 0) process.exit(1);
