#!/usr/bin/env node
/**
 * audit-hardcoded.mjs
 * Finds hardcoded English UI strings in component files that should use t()
 * Usage: node scripts/audit-hardcoded.mjs [--json]
 */

import { execSync } from "child_process";
import { readFileSync } from "fs";
import path from "path";

const SEARCH_DIRS = [
  "apps/web/core/components",
  "apps/web/ce/components",
  "apps/web/app",
];

// Patterns that indicate UI strings (key = prop name, value = min string length)
const UI_PROP_PATTERNS = [
  /(?:label|title|heading|message|description|placeholder|tooltipContent|tooltipHeading|buttonText|emptyStateTitle|emptyStateDescription)\s*[:=]\s*["']([A-Z][a-zA-Z0-9 ',\-\.!?]{2,80})["']/g,
  />\s*([A-Z][a-z][a-zA-Z0-9 ',\-\.!?]{3,60})\s*</g,  // JSX text content
];

const IGNORE_PATTERNS = [
  /t\(/,              // already using t()
  /^\s*\/\//,        // comment
  /import /,         // import statement
  /className/,       // CSS classes
  /\.(png|svg|jpg|ico|woff|css|js)/, // file paths
  /"[a-z-_]+"/,      // lowercase-only strings (keys, variants)
  /TOAST_TYPE\./,    // toast type constants
];

function shouldIgnoreLine(line) {
  return IGNORE_PATTERNS.some((p) => p.test(line));
}

const results = {};
let totalCount = 0;

for (const dir of SEARCH_DIRS) {
  let files;
  try {
    files = execSync(`find "${dir}" -name "*.tsx" -o -name "*.ts" 2>/dev/null`, {
      encoding: "utf8",
    })
      .trim()
      .split("\n")
      .filter(Boolean);
  } catch {
    continue;
  }

  for (const file of files) {
    let content;
    try {
      content = readFileSync(file, "utf8");
    } catch {
      continue;
    }

    const lines = content.split("\n");
    const fileMatches = [];

    lines.forEach((line, i) => {
      if (shouldIgnoreLine(line)) return;

      for (const pattern of UI_PROP_PATTERNS) {
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(line)) !== null) {
          const str = match[1].trim();
          // Skip very short strings and obviously non-UI strings
          if (str.length < 4) continue;
          if (/^[a-z]/.test(str)) continue; // starts lowercase
          if (/^[A-Z_0-9]+$/.test(str)) continue; // ALL_CAPS constant
          if (str.includes("${")) continue; // template literal
          if (/^https?:/.test(str)) continue; // URL

          fileMatches.push({
            line: i + 1,
            text: line.trim().slice(0, 120),
            match: str,
          });
          totalCount++;
        }
      }
    });

    if (fileMatches.length > 0) {
      const relPath = file.replace(/\\/g, "/");
      results[relPath] = fileMatches;
    }
  }
}

// Output
const isJson = process.argv.includes("--json");

if (isJson) {
  console.log(JSON.stringify(results, null, 2));
} else {
  console.log("=".repeat(70));
  console.log("HARDCODED ENGLISH STRINGS AUDIT");
  console.log("=".repeat(70));
  console.log();

  const fileList = Object.entries(results).sort(([, a], [, b]) => b.length - a.length);

  for (const [file, matches] of fileList) {
    console.log(`\n📄 ${file} (${matches.length} strings)`);
    console.log("-".repeat(60));
    for (const m of matches) {
      console.log(`  L${m.line}: "${m.match}"`);
      console.log(`         ${m.text}`);
    }
  }

  console.log("\n" + "=".repeat(70));
  console.log(`Total files with hardcoded strings: ${fileList.length}`);
  console.log(`Total hardcoded strings found: ${totalCount}`);
  console.log("=".repeat(70));
}
