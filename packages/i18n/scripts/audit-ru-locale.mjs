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

const args = process.argv.slice(2);
const overrideIndex = args.indexOf("--override");
const overridePath = overrideIndex >= 0 ? args[overrideIndex + 1] : null;

const cyrillicRe = /[А-Яа-яЁё]/;
const latinRe = /[A-Za-z]/;

const ignoredLineSubstrings = [
  "http://",
  "https://",
  "API",
  "URL",
  "ID",
  "CSV",
  "HEX",
  "GitHub",
  "GitLab",
  "Plane",
  "{email}",
  "name@company.com",
];

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
      if (!shouldIgnoreText(value)) {
        results.push({ file, key, value });
      }
    }
  }
  return results;
};

const parseOverrideMap = (content) => {
  const pairs = [];
  const mapMatches = [...content.matchAll(/\[\s*"((?:\\.|[^"])*)"\s*,\s*"((?:\\.|[^"])*)"\s*\]/g)];
  for (const m of mapMatches) {
    const en = decodeEscapes(m[1]);
    const ru = decodeEscapes(m[2]);
    pairs.push({ en, ru });
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
