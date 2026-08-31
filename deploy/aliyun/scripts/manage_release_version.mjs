#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '../../..');
const packageJsonPath = path.join(repoRoot, 'website', 'package.json');
const packageLockPath = path.join(repoRoot, 'website', 'package-lock.json');
const versionFilePath = path.join(repoRoot, 'website', 'release-version.json');

const releaseTypes = new Map([
  ['大改版', 'major'],
  ['新功能', 'minor'],
  ['修复优化', 'patch'],
]);

function fail(message) {
  console.error(message);
  process.exit(1);
}

function usage() {
  console.log(`Usage:
  node deploy/aliyun/scripts/manage_release_version.mjs plan --release-type-zh <大改版|新功能|修复优化> --output <file>
  node deploy/aliyun/scripts/manage_release_version.mjs apply --plan-file <file> [--format text|json|env]
  node deploy/aliyun/scripts/manage_release_version.mjs show [--format text|json|env]`);
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key.startsWith('--')) fail(`未知参数: ${key}`);
    const value = argv[index + 1];
    if (value == null || value.startsWith('--')) fail(`参数缺少值: ${key}`);
    result[key.slice(2)] = value;
    index += 1;
  }
  return result;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJsonAtomic(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(temporaryPath, filePath);
}

function parseSemver(value) {
  const match = typeof value === 'string' && value.match(/^(\d+)\.(\d+)\.(\d+)$/);
  return match
    ? { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) }
    : null;
}

function formatSemver(value) {
  return `${value.major}.${value.minor}.${value.patch}`;
}

function bumpSemver(value, type) {
  if (type === 'major') return { major: value.major + 1, minor: 0, patch: 0 };
  if (type === 'minor') return { major: value.major, minor: value.minor + 1, patch: 0 };
  return { major: value.major, minor: value.minor, patch: value.patch + 1 };
}

function currentState() {
  if (!fs.existsSync(packageJsonPath)) fail(`未找到 package.json: ${packageJsonPath}`);
  const packageJson = readJson(packageJsonPath);
  const versionMeta = fs.existsSync(versionFilePath) ? readJson(versionFilePath) : {};
  const semver = parseSemver(versionMeta.semver) ?? parseSemver(packageJson.version);
  if (!semver) fail('package.json 或 release-version.json 中没有有效的三段式版本号');
  const buildCount = Number.isInteger(versionMeta.buildCount) && versionMeta.buildCount >= 0
    ? versionMeta.buildCount
    : 0;
  return { packageJson, versionMeta, semver: formatSemver(semver), buildCount };
}

function makePlan(releaseTypeZh) {
  const releaseType = releaseTypes.get(releaseTypeZh);
  if (!releaseType) fail(`发布类型必须是：大改版 / 新功能 / 修复优化；收到：${releaseTypeZh}`);
  const state = currentState();
  const nextSemver = formatSemver(bumpSemver(parseSemver(state.semver), releaseType));
  const nextBuildCount = state.buildCount + 1;
  return {
    schemaVersion: 1,
    projectName: 'digital-product-consultant-site',
    releaseTypeZh,
    releaseType,
    baseSemver: state.semver,
    previousBuildCount: state.buildCount,
    nextSemver,
    nextBuildCount,
    displayVersion: `${nextSemver} (${nextBuildCount})`,
    gitTag: `v${nextSemver}-build.${nextBuildCount}`,
    plannedAt: new Date().toISOString(),
  };
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function outputState(value, format) {
  if (format === 'json') {
    process.stdout.write(`${JSON.stringify(value)}\n`);
    return;
  }
  if (format === 'env') {
    process.stdout.write([
      `RELEASE_SEMVER=${shellQuote(value.nextSemver ?? value.semver)}`,
      `RELEASE_BUILD_COUNT=${shellQuote(String(value.nextBuildCount ?? value.buildCount))}`,
      `RELEASE_DISPLAY_VERSION=${shellQuote(value.displayVersion)}`,
      `RELEASE_GIT_TAG=${shellQuote(value.gitTag ?? value.lastGitTag ?? '')}`,
      `RELEASE_TYPE_ZH=${shellQuote(value.releaseTypeZh ?? value.lastReleaseTypeZh ?? '')}`,
    ].join('\n'));
    process.stdout.write('\n');
    return;
  }
  console.log(value.displayVersion);
}

function applyPlan(plan) {
  const state = currentState();
  if (state.semver !== plan.baseSemver || state.buildCount !== plan.previousBuildCount) {
    fail('当前版本已发生变化，请重新打包并生成版本计划');
  }

  const packageJson = state.packageJson;
  packageJson.version = plan.nextSemver;
  writeJsonAtomic(packageJsonPath, packageJson);

  if (fs.existsSync(packageLockPath)) {
    const packageLock = readJson(packageLockPath);
    packageLock.version = plan.nextSemver;
    if (packageLock.packages?.['']) packageLock.packages[''].version = plan.nextSemver;
    writeJsonAtomic(packageLockPath, packageLock);
  }

  writeJsonAtomic(versionFilePath, {
    schemaVersion: 1,
    semver: plan.nextSemver,
    buildCount: plan.nextBuildCount,
    displayVersion: plan.displayVersion,
    lastReleaseTypeZh: plan.releaseTypeZh,
    lastReleasedAt: new Date().toISOString(),
    lastGitTag: plan.gitTag,
  });
}

const [command, ...rest] = process.argv.slice(2);
if (!command || command === '--help' || command === '-h') {
  usage();
  process.exit(command ? 0 : 1);
}

const args = parseArgs(rest);
const format = args.format ?? 'text';
if (!['text', 'json', 'env'].includes(format)) fail(`不支持的输出格式: ${format}`);

if (command === 'show') {
  const state = currentState();
  outputState({
    semver: state.semver,
    buildCount: state.buildCount,
    displayVersion: `${state.semver} (${state.buildCount})`,
    lastGitTag: state.versionMeta.lastGitTag,
    lastReleaseTypeZh: state.versionMeta.lastReleaseTypeZh,
  }, format);
  process.exit(0);
}

if (command === 'plan') {
  if (!args['release-type-zh'] || !args.output) {
    fail('plan 需要 --release-type-zh 和 --output');
  }
  const plan = makePlan(args['release-type-zh']);
  writeJsonAtomic(path.resolve(args.output), plan);
  outputState(plan, format);
  process.exit(0);
}

if (command === 'apply') {
  if (!args['plan-file']) fail('apply 需要 --plan-file');
  const planPath = path.resolve(args['plan-file']);
  if (!fs.existsSync(planPath)) fail(`未找到版本计划: ${planPath}`);
  const plan = readJson(planPath);
  applyPlan(plan);
  outputState(plan, format);
  process.exit(0);
}

fail(`未知命令: ${command}`);
