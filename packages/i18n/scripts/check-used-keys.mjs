#!/usr/bin/env node
/**
 * Checks literal i18n keys used in code against locale resources.
 *
 * Covered patterns:
 * - t("some.key")
 * - i18n_label: "some.key"
 * - i18nTitle="some.key"
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";

const cwd = process.cwd();
const repoRoot = cwd.endsWith(path.join("packages", "i18n")) ? path.resolve(cwd, "..", "..") : cwd;
const localesDir = path.join(repoRoot, "packages", "i18n", "src", "locales");
const scanRoots = ["apps/web", "packages/constants", "packages/i18n/src"].map((p) => path.join(repoRoot, p));
const sourceExtensions = new Set([".js", ".jsx", ".mjs", ".ts", ".tsx"]);
const ignoredDirs = new Set([".git", ".next", ".turbo", "build", "coverage", "dist", "node_modules"]);

const args = process.argv.slice(2);
const localeArg = args.find((arg) => arg.startsWith("--locale="));
const locales = localeArg ? localeArg.slice("--locale=".length).split(",").filter(Boolean) : ["ru"];
const checkedLocales = ["en", ...locales.filter((locale) => locale !== "en")];
const changedFromValues = [];
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === "--changed-from" && args[i + 1]) {
    changedFromValues.push(args[i + 1]);
    i += 1;
  } else if (args[i].startsWith("--changed-from=")) {
    changedFromValues.push(args[i].slice("--changed-from=".length));
  }
}
const changedFrom = changedFromValues.at(-1);

const keyLikeRe = /^[A-Za-z0-9_.-]+$/;
const patterns = [
  { kind: "t", re: /\bt\(\s*["']([A-Za-z0-9_.-]+)["']/g },
  { kind: "i18n_label", re: /\bi18n_label\s*:\s*["']([A-Za-z0-9_.-]+)["']/g },
  { kind: "i18nTitle", re: /\bi18nTitle\s*=\s*["']([A-Za-z0-9_.-]+)["']/g },
];

const flattenKeys = (value, prefix = "", result = new Set()) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return result;

  for (const [key, child] of Object.entries(value)) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === "object" && !Array.isArray(child)) {
      flattenKeys(child, next, result);
    } else {
      result.add(next);
    }
  }

  return result;
};

const loadLocaleKeys = (locale) => {
  const localeDir = path.join(localesDir, locale);
  if (!fs.existsSync(localeDir)) {
    throw new Error(`Locale directory not found: ${localeDir}`);
  }

  const keys = new Set();
  for (const file of fs.readdirSync(localeDir).filter((name) => name.endsWith(".json"))) {
    const parsed = JSON.parse(fs.readFileSync(path.join(localeDir, file), "utf8"));
    for (const key of flattenKeys(parsed)) {
      keys.add(key);
    }
  }
  return keys;
};

const walk = (dir, files = []) => {
  if (!fs.existsSync(dir)) return files;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) {
        walk(path.join(dir, entry.name), files);
      }
      continue;
    }

    const filePath = path.join(dir, entry.name);
    if (sourceExtensions.has(path.extname(entry.name))) {
      files.push(filePath);
    }
  }

  return files;
};

const listChangedFiles = (baseRef) => {
  if (!baseRef) return null;

  const diffArgs =
    baseRef === "WORKTREE" ? ["diff", "--name-only", "HEAD"] : ["diff", "--name-only", `${baseRef}...HEAD`];
  const output = execFileSync("git", diffArgs, {
    cwd: repoRoot,
    encoding: "utf8",
  });
  const allowedRoots = scanRoots.map((root) => path.relative(repoRoot, root).replace(/\\/g, "/"));

  return output
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((file) => allowedRoots.some((root) => file === root || file.startsWith(`${root}/`)))
    .filter((file) => sourceExtensions.has(path.extname(file)))
    .map((file) => path.join(repoRoot, file));
};

const lineForIndex = (content, index) => content.slice(0, index).split(/\r?\n/).length;

const collectUsedKeys = () => {
  const used = new Map();
  const files = changedFrom ? listChangedFiles(changedFrom) : scanRoots.flatMap((root) => walk(root));

  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    for (const { kind, re } of patterns) {
      for (const match of content.matchAll(re)) {
        const key = match[1];
        if (!keyLikeRe.test(key)) continue;

        const existing = used.get(key) ?? [];
        existing.push({
          kind,
          file: path.relative(repoRoot, file).replace(/\\/g, "/"),
          line: lineForIndex(content, match.index ?? 0),
        });
        used.set(key, existing);
      }
    }
  }

  return used;
};

const main = () => {
  const localeKeys = new Map(checkedLocales.map((locale) => [locale, loadLocaleKeys(locale)]));
  const usedKeys = collectUsedKeys();
  const missing = [];

  for (const [key, usages] of usedKeys) {
    for (const [locale, keys] of localeKeys) {
      if (!keys.has(key)) {
        missing.push({ key, locale, usages });
      }
    }
  }

  console.log("== Used i18n key check ==");
  console.log(`Locales: ${checkedLocales.join(", ")}`);
  if (changedFrom) {
    console.log(`Changed-from: ${changedFrom}`);
  }
  console.log(`Used literal keys: ${usedKeys.size}`);
  console.log(`Missing key entries: ${missing.length}`);

  if (missing.length > 0) {
    for (const item of missing.slice(0, 100)) {
      const first = item.usages[0];
      console.log(`- [${item.locale}] ${item.key} (${first.kind}) at ${first.file}:${first.line}`);
      for (const usage of item.usages.slice(1, 4)) {
        console.log(`  also at ${usage.file}:${usage.line}`);
      }
      if (item.usages.length > 4) {
        console.log(`  ... and ${item.usages.length - 4} more`);
      }
    }
    if (missing.length > 100) {
      console.log(`... and ${missing.length - 100} more`);
    }
    process.exit(1);
  }
};

try {
  main();
} catch (error) {
  console.error("Used key check failed:", error);
  process.exit(1);
}
