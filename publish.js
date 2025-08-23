#!/usr/bin/env node
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Root directory
const repoRoot = __dirname;

// File paths
const standalonePkg = path.join(repoRoot, "package.json");
const scopedPkg = path.join(repoRoot, "package.scoped.json");

// Function to get current version from npm
function getPublishedVersion(pkgName) {
  try {
    const version = execSync(`npm view ${pkgName} version`, { stdio: ['pipe', 'pipe', 'ignore'] })
      .toString()
      .trim();
    return version;
  } catch (err) {
    return null; // package not published yet
  }
}

// Function to bump patch version in package.json
function bumpVersion(pkgPath) {
  const pkgData = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  const [major, minor, patch] = pkgData.version.split(".").map(Number);
  const newVersion = `${major}.${minor}.${patch + 1}`;
  pkgData.version = newVersion;
  fs.writeFileSync(pkgPath, JSON.stringify(pkgData, null, 2));
  console.log(`\n🔼 Bumped ${pkgData.name} to version ${newVersion}`);
  return newVersion;
}

// Function to publish a package (with auto-bump)
function publishPackage(pkgPath) {
  const pkgData = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  const publishedVersion = getPublishedVersion(pkgData.name);

  if (publishedVersion === pkgData.version) {
    console.log(`\nℹ️  ${pkgData.name}@${pkgData.version} already published. Bumping patch...`);
    bumpVersion(pkgPath);
  }

  const finalVersion = JSON.parse(fs.readFileSync(pkgPath, "utf-8")).version;

  console.log(`\n📦 Publishing "${pkgData.name}" version ${finalVersion}...`);
  execSync("npm publish --access public", { cwd: repoRoot, stdio: "inherit" });
}

// Function to handle both standalone and scoped
function publishBoth() {
  // 1️⃣ Publish standalone package
  publishPackage(standalonePkg);

  // 2️⃣ Publish scoped package if exists
  if (fs.existsSync(scopedPkg)) {
    const backupPkg = path.join(repoRoot, "package.json.bak");

    // Backup original package.json
    fs.renameSync(standalonePkg, backupPkg);

    // Copy scoped package.json to package.json
    fs.copyFileSync(scopedPkg, standalonePkg);

    // Publish scoped package
    publishPackage(standalonePkg);

    // Restore original package.json
    fs.renameSync(backupPkg, standalonePkg);
  }

  console.log("\n✅ All packages published successfully!");
}

// Run the publish process
publishBoth();
