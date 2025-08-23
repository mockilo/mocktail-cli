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

// Bump patch version
function bumpVersionFrom(version) {
  const [major, minor, patch] = version.split(".").map(Number);
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

// Commit updated package.json files
function gitCommitAndPush(pkgPaths, newVersion) {
  execSync(`git config user.name "github-actions"`, { cwd: repoRoot });
  execSync(`git config user.email "github-actions@users.noreply.github.com"`, { cwd: repoRoot });
  execSync(`git add ${pkgPaths.join(" ")}`, { cwd: repoRoot });
  execSync(`git commit -m "chore: bump version to ${newVersion}"`, { cwd: repoRoot });
  execSync(`git push origin HEAD`, { cwd: repoRoot });
  console.log(`💾 Committed and pushed version ${newVersion}`);
}

// Publish a single package
function publishPackage(pkgPath) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  const publishedVersion = getPublishedVersion(pkg.name);

  let newVersion = pkg.version;

  if (publishedVersion && publishedVersion >= pkg.version) {
    newVersion = bumpVersionFrom(publishedVersion);
    updateVersion(pkgPath, newVersion);
    gitCommitAndPush([pkgPath], newVersion);
  }

  console.log(`📦 Publishing ${pkg.name}@${newVersion}...`);
  execSync("npm publish --access public", { cwd: repoRoot, stdio: "inherit" });

  return newVersion;
}

// Publish both standalone and scoped packages
function publishBoth() {
  // Standalone package
  const standaloneVersion = publishPackage(standalonePkg);

  // Scoped package
  if (fs.existsSync(scopedPkg)) {
    const backupPkg = path.join(repoRoot, "package.json.bak");
    fs.renameSync(standalonePkg, backupPkg);
    fs.copyFileSync(scopedPkg, standalonePkg);
    const scopedVersion = publishPackage(standalonePkg);
    fs.renameSync(backupPkg, standalonePkg);
  }

  console.log("✅ All packages published successfully!");
}

publishBoth();
