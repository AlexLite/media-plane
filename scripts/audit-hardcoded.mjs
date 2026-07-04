#!/usr/bin/env node
/**
 * Finds likely hardcoded English UI strings that should use i18n keys.
 *
 * Default mode is a report over known frontend surfaces. CI should use
 * --changed so existing debt does not block unrelated upstream syncs.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const DEFAULT_SEARCH_DIRS = [
  "apps/web",
  "apps/admin",
  "apps/space",
  "packages/ui",
  "packages/editor",
];

const VALID_EXTENSIONS = new Set([".ts", ".tsx"]);
const IGNORE_FILE_PATTERNS = [
  /\.d\.ts$/,
  /\.test\.[tj]sx?$/,
  /\.spec\.[tj]sx?$/,
  /\.stories\.[tj]sx?$/,
  // Billing plan comparison is intentionally left as upstream English copy for now.
  /(^|\/)apps\/web\/core\/constants\/plans\.tsx$/,
  /(^|\/)__tests__(\/|$)/,
  /(^|\/)node_modules(\/|$)/,
  /(^|\/)\.next(\/|$)/,
  /(^|\/)dist(\/|$)/,
  /(^|\/)build(\/|$)/,
];

const UI_STRING_PATTERNS = [
  {
    kind: "prop",
    pattern:
      /(?:aria-label|label|title|heading|message|description|placeholder|tooltipContent|tooltipHeading|buttonText|emptyStateTitle|emptyStateDescription)\s*[:=]\s*["']([A-Z][A-Za-z0-9 ',./:;!?()[\]&+-]{2,100})["']/g,
  },
  {
    kind: "jsx-text",
    pattern: />\s*([A-Z][A-Za-z0-9 ',./:;!?()[\]&+-]{3,100})\s*</g,
  },
];

const IGNORE_LINE_PATTERNS = [
  /i18n-hardcoded-ok/,
  /\bt\(/,
  /<Trans\b/,
  /\bi18nKey=/,
  /^\s*\/\//,
  /^\s*\*/,
  /^\s*import\b/,
  /^\s*export\s+type\b/,
  /^\s*type\s+\w+/,
  /^\s*interface\s+\w+/,
  /\bReact\.ComponentType\b/,
  /\bPromise\s*</,
  /\b(?:Partial|Record|Readonly|Pick|Omit|Parameters|ReturnType|Exclude|Extract|NonNullable|Required)\s*</,
  /\bclassName\s*=/,
  /\b(?:href|src|url|path|icon|image|avatar|logo|testId|data-testid)\s*[:=]/,
  /\.(png|svg|jpg|jpeg|webp|ico|woff2?|css|mjs|js)\b/i,
  /\bTOAST_TYPE\./,
];

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

const candidateFiles = args.changed ? getChangedFiles(args.base) : getAllFiles(args.searchDirs);
const auditResults = auditFiles(candidateFiles);
const findingCount = Object.values(auditResults).reduce((sum, matches) => sum + matches.length, 0);

if (args.json) {
  console.log(JSON.stringify(auditResults, null, 2));
} else {
  printReport(auditResults, findingCount, candidateFiles.length, args.changed);
}

if (args.ci && findingCount > 0) {
  process.exitCode = 1;
}

function parseArgs(argv) {
  const parsed = {
    base: "HEAD~1",
    changed: false,
    ci: false,
    help: false,
    json: false,
    searchDirs: DEFAULT_SEARCH_DIRS,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--base") {
      parsed.base = argv[i + 1] || parsed.base;
      i += 1;
    } else if (arg.startsWith("--base=")) {
      parsed.base = arg.slice("--base=".length) || parsed.base;
    } else if (arg === "--changed") {
      parsed.changed = true;
    } else if (arg === "--ci") {
      parsed.ci = true;
    } else if (arg === "--dir") {
      parsed.searchDirs = [argv[i + 1]];
      i += 1;
    } else if (arg.startsWith("--dir=")) {
      parsed.searchDirs = [arg.slice("--dir=".length)];
    } else if (arg === "--help" || arg === "-h") {
      parsed.help = true;
    } else if (arg === "--json") {
      parsed.json = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return parsed;
}

function printHelp() {
  console.log(`Usage: node scripts/audit-hardcoded.mjs [options]

Options:
  --changed          Check only TS/TSX files changed against --base.
  --base <ref>       Base ref or SHA for --changed. Defaults to HEAD~1.
  --ci               Exit with status 1 when findings are present.
  --dir <path>       Check one directory instead of default frontend surfaces.
  --json             Print machine-readable findings.
  -h, --help         Show this help.

Add // i18n-hardcoded-ok on a line for intentional literals.`);
}

function getAllFiles(searchDirs) {
  const foundFiles = [];

  for (const searchDir of searchDirs) {
    if (!existsSync(searchDir)) continue;
    walk(searchDir, foundFiles);
  }

  return foundFiles.filter(isCandidateFile).toSorted();
}

function walk(dir, foundFiles) {
  for (const entry of readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      if (!shouldIgnoreFile(toPosix(fullPath))) walk(fullPath, foundFiles);
      continue;
    }

    foundFiles.push(toPosix(fullPath));
  }
}

function getChangedFiles(base) {
  let output = "";

  try {
    output = execFileSync("git", ["diff", "--name-only", "--diff-filter=ACMR", `${base}...HEAD`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    output = execFileSync("git", ["diff", "--name-only", "--diff-filter=ACMR", base, "HEAD"], {
      encoding: "utf8",
    });
  }

  return output
    .split(/\r?\n/)
    .map((file) => file.trim())
    .filter(Boolean)
    .filter((file) => DEFAULT_SEARCH_DIRS.some((dir) => file === dir || file.startsWith(`${dir}/`)))
    .filter((file) => existsSync(file))
    .filter(isCandidateFile)
    .toSorted();
}

function isCandidateFile(file) {
  return VALID_EXTENSIONS.has(path.extname(file)) && !shouldIgnoreFile(toPosix(file));
}

function shouldIgnoreFile(file) {
  return IGNORE_FILE_PATTERNS.some((pattern) => pattern.test(file));
}

function auditFiles(filesToAudit) {
  const findings = {};

  for (const file of filesToAudit) {
    const content = readFileSync(file, "utf8");
    const matches = [];
    let isInsideBlockComment = false;

    content.split(/\r?\n/).forEach((line, index) => {
      if (isInsideBlockComment) {
        if (line.includes("*/")) isInsideBlockComment = false;
        return;
      }
      if (line.includes("/*")) {
        if (!line.includes("*/")) isInsideBlockComment = true;
        return;
      }
      if (shouldIgnoreLine(line)) return;

      for (const { kind, pattern } of UI_STRING_PATTERNS) {
        pattern.lastIndex = 0;
        let match;

        while ((match = pattern.exec(line)) !== null) {
          const value = match[1].trim();
          if (!isLikelyUiString(value)) continue;

          matches.push({
            kind,
            line: index + 1,
            match: value,
            text: line.trim().slice(0, 160),
          });
        }
      }
    });

    if (matches.length > 0) {
      findings[toPosix(file)] = matches;
    }
  }

  return findings;
}

function shouldIgnoreLine(line) {
  return IGNORE_LINE_PATTERNS.some((pattern) => pattern.test(line));
}

function isLikelyUiString(value) {
  if (value.length < 4) return false;
  if (/^[A-Z_0-9-]+$/.test(value)) return false;
  if (/^https?:\/\//.test(value)) return false;
  if (/^[A-Z][a-z]+(?:Icon|Type|Status|State|Variant)$/.test(value)) return false;
  if (value.includes("${")) return false;
  if (value.includes("{{")) return false;
  if (/^[A-Z][a-z]+\/[A-Z][a-z]+$/.test(value)) return false;

  return /[A-Za-z]/.test(value);
}

function printReport(results, reportFindingCount, scannedCount, changedOnly) {
  const fileList = Object.entries(results).toSorted(([, a], [, b]) => b.length - a.length);

  console.log("=".repeat(70));
  console.log("HARDCODED ENGLISH UI STRINGS AUDIT");
  console.log("=".repeat(70));
  console.log(`Mode: ${changedOnly ? "changed files" : "full report"}`);
  console.log(`Candidate files scanned: ${scannedCount}`);

  for (const [file, matches] of fileList) {
    console.log(`\n${file} (${matches.length} findings)`);
    console.log("-".repeat(60));

    for (const match of matches) {
      console.log(`  L${match.line} [${match.kind}]: "${match.match}"`);
      console.log(`         ${match.text}`);
    }
  }

  console.log("\n" + "=".repeat(70));
  console.log(`Files with findings: ${fileList.length}`);
  console.log(`Total findings: ${reportFindingCount}`);
  console.log("=".repeat(70));
}

function toPosix(file) {
  return file.replace(/\\/g, "/");
}
