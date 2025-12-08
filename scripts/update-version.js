#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Updates version in package.json
 * Usage: node scripts/update-version.js <new-version>
 * Example: node scripts/update-version.js 0.1.1
 */

const newVersion = process.argv[2];

if (!newVersion) {
  console.error("Please provide a version number");
  console.error("Usage: node scripts/update-version.js <new-version>");
  console.error("Example: node scripts/update-version.js 0.1.1");
  process.exit(1);
}

// Validate version format
const versionRegex = /^\d+\.\d+\.\d+(-[\w.]+)?$/;
if (!versionRegex.test(newVersion)) {
  console.error(
    "Invalid version format. Please use semantic versioning (e.g., 1.2.3 or 1.2.3-beta.1)"
  );
  process.exit(1);
}

const packagePath = path.join(__dirname, "..", "package.json");

try {
  const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  const oldVersion = packageJson.version;
  packageJson.version = newVersion;

  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + "\n");
  console.log(`Updated package.json from ${oldVersion} to ${newVersion}`);
} catch (error) {
  console.error(`Failed to update package.json: ${error.message}`);
  process.exit(1);
}

// Update package-lock.json
console.log("\nUpdating package-lock.json...");
try {
  execSync("npm install", { stdio: "inherit", cwd: path.join(__dirname, "..") });
  console.log("package-lock.json updated");
} catch (error) {
  console.error(`Failed to update package-lock.json: ${error.message}`);
  console.error('Please run "npm install" manually');
  process.exit(1);
}

console.log("\nVersion update complete!");
console.log("\nNext steps:");
console.log("1. Review changes: git diff");
console.log(
  `2. Commit: git add -A && git commit -m "chore: bump version to ${newVersion}"`
);
console.log(`3. Tag: git tag v${newVersion}`);
console.log("4. Push: git push && git push --tags");
