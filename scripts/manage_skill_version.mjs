#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const skillPath = path.join(repoRoot, 'SKILL.md');
const packageJsonPath = path.join(repoRoot, 'website', 'package.json');
const packageLockPath = path.join(repoRoot, 'website', 'package-lock.json');
const releaseVersionPath = path.join(repoRoot, 'website', 'release-version.json');
const semverPattern = /^(\d+)\.(\d+)\.(\d+)$/;

function fail(message) {
  console.error(message);
  process.exit(1);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJsonAtomic(filePath, value) {
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(temporaryPath, filePath);
}

function readSkillVersion(content = fs.readFileSync(skillPath, 'utf8')) {
  const frontmatter = content.match(/^---\n([\s\S]*?)\n---/)?.[1];
  if (!frontmatter) fail('SKILL.md 缺少有效 Frontmatter');
  const version = frontmatter.match(
    /^metadata:\s*\n(?: {2}[^\n]*\n)*? {2}version:\s*["']?(\d+\.\d+\.\d+)["']?\s*$/m,
  )?.[1];
  if (!version) fail('SKILL.md metadata.version 缺失或不是三段式 SemVer');
  return version;
}

function parseVersion(value) {
  const match = String(value ?? '').match(semverPattern);
  if (!match) fail(`无效版本号: ${value}`);
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
}

function formatVersion(value) {
  return `${value.major}.${value.minor}.${value.patch}`;
}

function bumpVersion(current, level) {
  if (level === 'major') return `${current.major + 1}.0.0`;
  if (level === 'minor') return `${current.major}.${current.minor + 1}.0`;
  if (level === 'patch') return `${current.major}.${current.minor}.${current.patch + 1}`;
  fail(`升级级别必须是 major、minor 或 patch；收到: ${level}`);
}

function replaceSkillVersion(content, version) {
  const replaced = content.replace(
    /(^metadata:\s*\n(?: {2}[^\n]*\n)*? {2}version:\s*)["']?\d+\.\d+\.\d+["']?(\s*$)/m,
    `$1"${version}"$2`,
  );
  if (replaced === content && readSkillVersion(content) !== version) {
    fail('无法更新 SKILL.md metadata.version');
  }
  return replaced;
}

function currentState() {
  const skillVersion = readSkillVersion();
  const packageJson = readJson(packageJsonPath);
  const packageLock = readJson(packageLockPath);
  const releaseVersion = readJson(releaseVersionPath);
  const packageLockVersion = packageLock.packages?.['']?.version;
  return { skillVersion, packageJson, packageLock, packageLockVersion, releaseVersion };
}

function check() {
  const state = currentState();
  const versions = new Map([
    ['SKILL.md metadata.version', state.skillVersion],
    ['website/package.json', state.packageJson.version],
    ['website/package-lock.json', state.packageLock.version],
    ['website/package-lock.json packages[""]', state.packageLockVersion],
    ['website/release-version.json', state.releaseVersion.semver],
  ]);
  for (const [source, version] of versions) {
    if (version !== state.skillVersion) {
      fail(`版本不一致：${source}=${version ?? '缺失'}，期望 ${state.skillVersion}`);
    }
  }
  console.log(`Skill 版本一致：${state.skillVersion}`);
  return state;
}

function applyVersion(version) {
  parseVersion(version);
  const state = currentState();
  fs.writeFileSync(
    skillPath,
    replaceSkillVersion(fs.readFileSync(skillPath, 'utf8'), version),
    'utf8',
  );

  state.packageJson.version = version;
  state.packageLock.version = version;
  if (state.packageLock.packages?.['']) state.packageLock.packages[''].version = version;

  const versionChanged = state.releaseVersion.semver !== version;
  state.releaseVersion.semver = version;
  state.releaseVersion.displayVersion = `${version} (${state.releaseVersion.buildCount ?? 0})`;
  if (versionChanged) {
    state.releaseVersion.lastReleaseTypeZh = null;
    state.releaseVersion.lastReleasedAt = null;
    state.releaseVersion.lastGitTag = null;
  }

  writeJsonAtomic(packageJsonPath, state.packageJson);
  writeJsonAtomic(packageLockPath, state.packageLock);
  writeJsonAtomic(releaseVersionPath, state.releaseVersion);
  console.log(`Skill 版本已更新为 ${version}`);
}

function usage() {
  console.log(`Usage:
  node scripts/manage_skill_version.mjs show
  node scripts/manage_skill_version.mjs check
  node scripts/manage_skill_version.mjs set <x.y.z>
  node scripts/manage_skill_version.mjs set --version <x.y.z>
  node scripts/manage_skill_version.mjs bump <major|minor|patch>
  node scripts/manage_skill_version.mjs bump --level <major|minor|patch>`);
}

const [command, ...args] = process.argv.slice(2);

if (!command || command === '--help' || command === '-h') {
  usage();
  process.exit(command ? 0 : 1);
}

if (command === 'show') {
  const state = currentState();
  console.log(state.skillVersion);
  process.exit(0);
}

if (command === 'check') {
  check();
  process.exit(0);
}

if (command === 'set') {
  const version = args[0] === '--version' ? args[1] : args[0];
  if (!version) fail('set 需要版本号');
  applyVersion(version);
  check();
  process.exit(0);
}

if (command === 'bump') {
  const level = args[0] === '--level' ? args[1] : args[0];
  if (!level) fail('bump 需要升级级别');
  const nextVersion = bumpVersion(parseVersion(readSkillVersion()), level);
  applyVersion(nextVersion);
  check();
  process.exit(0);
}

fail(`未知命令: ${command}`);
