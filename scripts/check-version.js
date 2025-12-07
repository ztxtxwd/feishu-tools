#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Checks version consistency between package.json and package-lock.json
 * Exits with code 1 if versions are inconsistent
 * Usage: node scripts/check-version.js
 */

console.log("Checking version consistency...\n");

const rootDir = path.join(__dirname, "..");
const packagePath = path.join(rootDir, "package.json");
const lockPath = path.join(rootDir, "package-lock.json");

let hasError = false;

// Read package.json
let packageJson;
try {
  packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  console.log(`package.json version: ${packageJson.version}`);
} catch (error) {
  console.error(`Failed to read package.json: ${error.message}`);
  process.exit(1);
}

// Check package-lock.json
if (fs.existsSync(lockPath)) {
  try {
    const lockFile = JSON.parse(fs.readFileSync(lockPath, "utf8"));
    console.log(`package-lock.json version: ${lockFile.version}`);

    if (lockFile.version !== packageJson.version) {
      console.error(
        `\nVersion mismatch: package.json (${packageJson.version}) vs package-lock.json (${lockFile.version})`
      );
      hasError = true;
    }
  } catch (error) {
    console.error(`Failed to read package-lock.json: ${error.message}`);
    hasError = true;
  }
} else {
  console.warn("package-lock.json not found (skipping lock file check)");
}

// Validate version format
const versionRegex = /^\d+\.\d+\.\d+(-[\w.]+)?$/;
if (!versionRegex.test(packageJson.version)) {
  console.error(
    `\nInvalid version format: ${packageJson.version}. Expected semantic versioning (e.g., 1.2.3)`
  );
  hasError = true;
}

// Final result
console.log("\nResult:");
if (hasError) {
  console.error("Version check failed!");
  console.error('\nRun "npm install" to sync package-lock.json');
  process.exit(1);
} else {
  console.log("Version check passed!");
  process.exit(0);
}
