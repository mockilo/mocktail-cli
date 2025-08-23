#!/usr/bin/env node
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const repoRoot = __dirname;
const standalonePkg = path.join(repoRoot, "package.json");
const scopedPkg = path.join(repoRoot, "package.scoped.json");

// Get the version currently published on npm
function getPublishedVersion(pkgName) {
  try {
    return execSync(`npm view ${pkgName} version`, { stdio: ['pipe','pipe','ignore'] })
      .toString().trim();
  } catch {
    return null; // Not published yet
  }
}

// Bump patch version based on a given current version
function bumpVersionFrom(currentVersion) {
  const [major, minor, patch] = currentVersion.split(".").map(Number);
  return `${major}.${minor}.${patch + 1}`;
}

// Update package.json with new version
function updateVersion(pkgPath, newVersion) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  pkg.version = newVersion;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
  console.log(`🔼 Updated ${pkg.name} to version ${newVersion}`);
  return newVersion;
}

// Publish package (auto-bump based on npm version)
function publishPackage(pkgPath) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  const publishedVersion = getPublishedVersion(pkg.name);

  let newVersion = pkg.version;

  if (publishedVersion && publishedVersion === pkg.version) {
    // Automatically bump patch from published version
    newVersion = bumpVersionFrom(publishedVersion);
    updateVersion(pkgPath, newVersion);
  }

  console.log(`📦 Publishing ${pkg.name}@${newVersion}...`);
  execSync("npm publish --access public", { cwd: repoRoot, stdio: "inherit" });
}

// Publish both standalone and scoped packages
function publishBoth() {
  // Standalone package
  publishPackage(standalonePkg);

  // Scoped package
  if (fs.existsSync(scopedPkg)) {
    const backupPkg = path.join(repoRoot, "package.json.bak");
    fs.renameSync(standalonePkg, backupPkg);
    fs.copyFileSync(scopedPkg, standalonePkg);
    publishPackage(standalonePkg);
    fs.renameSync(backupPkg, standalonePkg);
  }

  console.log("✅ All packages published successfully!");
}

// Run the publish process
publishBoth();
