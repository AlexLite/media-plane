#!/usr/bin/env node
/**
 * Quick RU locale audit helper.
 *
 * Checks:
 * 1) Lines with likely untranslated English in ru locale files.
 * 2) Optional: compare with an override file and show phrases still found in ru locale values.
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
const ruFiles = ["translations.ts", "empty-state.ts", "accessibility.ts", "editor.ts"];

const args = process.argv.slice(2);
const overrideIndex = args.indexOf("--override");
const overridePath = overrideIndex >= 0 ? args[overrideIndex + 1] : null;

const cyrillicRe = /[А-Яа-яЁё]/;
const latinRe = /[A-Za-z]/;

const ignoredLineSubstrings = [
  "http://",
  "https://",
  "aria_labels.",
  "API",
  "URL",
  "ID",
  "CSV",
  "HEX",
  "GitHub",
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

const isAsciiWord = (text) => {
  if (!text) return false;
  let hasUnderscore = false;
  for (const char of text) {
    const code = char.charCodeAt(0);
    const isLetter = code >= 65 && code <= 90;
    const isLower = code >= 97 && code <= 122;
    const isNumber = code >= 48 && code <= 57;
    const isPunctuation = char === "." || char === "-" || char === "_";
    if (char === "_") hasUnderscore = true;
    if (!(isLetter || isLower || isNumber || isPunctuation)) return false;
  }
  return hasUnderscore;
};

const extractQuotedStrings = (line) => {
  const matches = [];
  let inString = false;
  let escaped = false;
  let current = "";

  for (const char of line) {
    if (!inString) {
      if (char === '"') {
        inString = true;
        current = "";
        escaped = false;
      }
      continue;
    }

    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === "\\") {
      current += char;
      escaped = true;
      continue;
    }

    if (char === '"') {
      matches.push(current);
      inString = false;
      continue;
    }

    current += char;
  }

  return matches;
};

const extractOverridePairs = (content) => {
  const pairs = [];
  const lines = content.split("\n");
  for (const line of lines) {
    const quoted = extractQuotedStrings(line);
    if (quoted.length >= 2) {
      pairs.push([quoted[0], quoted[1]]);
    }
  }
  return pairs;
};

const shouldIgnoreText = (text) => {
  if (!text) return true;
  if (!latinRe.test(text)) return true;
  if (cyrillicRe.test(text)) return true;
  if (text.length <= 1) return true;
  if (isAsciiWord(text)) return true;
  return ignoredLineSubstrings.some((x) => text.includes(x));
};

const collectRuCandidates = () => {
  const results = [];
  for (const file of ruFiles) {
    const filePath = path.join(ruDir, file);
    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.replace(/\r/g, "").split("\n");
    lines.forEach((line, i) => {
      const matches = extractQuotedStrings(line);
      for (const match of matches) {
        const value = decodeEscapes(match);
        if (!shouldIgnoreText(value)) {
          results.push({ file, line: i + 1, value });
        }
      }
    });
  }
  return results;
};

const parseOverrideMap = (content) => {
  const pairs = [];
  for (const [enRaw, ruRaw] of extractOverridePairs(content)) {
    const en = decodeEscapes(enRaw);
    const ru = decodeEscapes(ruRaw);
    pairs.push({ en, ru });
  }
  return pairs;
};

const main = () => {
  if (!fs.existsSync(ruDir)) {
    console.error(`RU locales directory not found: ${ruDir}`);
    process.exit(1);
  }

  const untranslated = collectRuCandidates();
  console.log("== RU locale audit ==");
  console.log(`Files: ${ruFiles.join(", ")}`);
  console.log(`Potential untranslated values: ${untranslated.length}`);
  untranslated.slice(0, 200).forEach((it) => {
    console.log(`${it.file}:${it.line} -> ${it.value}`);
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
