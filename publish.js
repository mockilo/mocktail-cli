#!/usr/bin/env node
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const repoRoot = __dirname;
const standalonePkg = path.join(repoRoot, "package.json");
const scopedPkg = path.join(repoRoot, "package.scoped.json");

// Get the latest published version from npm
function getPublishedVersion(pkgName) {
  try {
    return execSync(`npm view ${pkgName} version`, { stdio: ['pipe','pipe','ignore'] })
      .toString().trim();
  } catch {
    return null; // Not published yet
  }
}

// Bump patch version from a given version string
function bumpVersionFrom(version) {
  const [major, minor, patch] = version.split(".").map(Number);
  return `${major}.${minor}.${patch + 1}`;
}

// Update package.json file with new version
function updateVersion(pkgPath, newVersion) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  pkg.version = newVersion;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
  console.log(`🔼 Updated ${pkg.name} to version ${newVersion}`);
  return newVersion;
}

// Commit updated package.json files automatically
function gitCommitVersion(pkgPaths, newVersion) {
  execSync(`git add ${pkgPaths.join(" ")}`, { cwd: repoRoot });
  execSync(`git commit -m "chore: bump version to ${newVersion}"`, { cwd: repoRoot });
  console.log(`💾 Committed version ${newVersion} to git`);
}

// Publish a single package
function publishPackage(pkgPath) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  const publishedVersion = getPublishedVersion(pkg.name);

  let newVersion = pkg.version;

  // Always bump if published version is >= local version
  if (publishedVersion && publishedVersion >= pkg.version) {
    newVersion = bumpVersionFrom(publishedVersion);
    updateVersion(pkgPath, newVersion);
    gitCommitVersion([pkgPath], newVersion);
  }

  console.log(`📦 Publishing ${pkg.name}@${newVersion}...`);
  execSync("npm publish --access public", { cwd: repoRoot, stdio: "inherit" });

  return newVersion;
}

// Publish both standalone and scoped packages
function publishBoth() {
  // 1️⃣ Standalone package
  const standaloneVersion = publishPackage(standalonePkg);

  // 2️⃣ Scoped package
  if (fs.existsSync(scopedPkg)) {
    const backupPkg = path.join(repoRoot, "package.json.bak");
    fs.renameSync(standalonePkg, backupPkg);
    fs.copyFileSync(scopedPkg, standalonePkg);
    const scopedVersion = publishPackage(standalonePkg);
    fs.renameSync(backupPkg, standalonePkg);
  }

  console.log("✅ All packages published successfully!");
}

// Run the process
publishBoth();
