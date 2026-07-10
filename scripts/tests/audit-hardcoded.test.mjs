import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..", "..");
const fixtureDir = path.join(root, "scripts", "tests", "fixtures", "audit-hardcoded");

test("detects missing translation keys and Cyrillic UI literals", () => {
  const output = execFileSync(process.execPath, ["scripts/audit-hardcoded.mjs", "--dir", fixtureDir, "--json"], {
    cwd: root,
    encoding: "utf8",
  });
  const findings = Object.values(JSON.parse(output)).flat();

  assert(findings.some((finding) => finding.kind === "missing-translation-key" && finding.match === "missing.key"));
  assert(findings.some((finding) => finding.kind === "cyrillic-ui-value" && finding.match === "Русский текст"));
});
