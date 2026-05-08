import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SOURCE_DIRS = ["app", "components", "features", "hooks", "lib", "store", "workers", "tests"];
const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "coverage", "dist", "build"]);

function extensionOf(file) {
  const index = file.lastIndexOf(".");
  return index >= 0 ? file.slice(index) : "";
}

function repoPath(file) {
  return relative(ROOT, file).replaceAll("\\", "/");
}

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      yield* walk(fullPath);
    } else if (EXTENSIONS.has(extensionOf(entry))) {
      yield fullPath;
    }
  }
}

const checks = [
  {
    name: "console.log",
    pattern: /\bconsole\.log\s*\(/,
    fileFilter: (file) => !repoPath(file).startsWith("tests/"),
  },
  {
    name: "TODO",
    pattern: /\bTODO\b/,
    fileFilter: () => true,
  },
  {
    name: "explicit any",
    pattern: /(?:\bany\[\]|\bRecord<[^>]+,\s*any\b|:\s*any\b|as\s+any\b|<any>)/,
    fileFilter: () => true,
  },
  {
    name: "skipped tests",
    pattern: /\b(?:it|test|describe)\.skip\s*\(/,
    fileFilter: (file) => repoPath(file).startsWith("tests/"),
  },
];

const failures = [];

for (const dir of SOURCE_DIRS) {
  const root = join(ROOT, dir);
  try {
    for (const file of walk(root)) {
      const text = readFileSync(file, "utf8");
      for (const check of checks) {
        if (!check.fileFilter(file)) continue;
        const lines = text.split(/\r?\n/);
        lines.forEach((line, index) => {
          if (check.pattern.test(line)) {
            failures.push(`${check.name}: ${repoPath(file)}:${index + 1}`);
          }
        });
      }
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

if (failures.length > 0) {
  console.error("Quality gates failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.info("Quality gates passed.");
