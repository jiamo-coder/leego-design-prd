#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '../../..');
const defaultApprovalFile = path.join(repoRoot, 'deploy', 'aliyun', '.git-release-approval.local.json');
const allowedTypes = 'feat|fix|refactor|perf|docs|test|build|ci|chore';
const fieldLabels = ['问题/需求', '实现结果', '影响范围', '验证方式', '关联任务', '风险与回滚'];

function fail(message) {
  console.error(message);
  process.exit(1);
}

function usage() {
  console.log(`Usage:
  manage_git_release_commit.mjs approve --message-file <file> --paths-file <file> --git-tag <tag>
    [--approval-file <file>] [--allow-untracked true] [--allow-initial-all true]
  manage_git_release_commit.mjs verify --approval-file <file> --git-tag <tag>
  manage_git_release_commit.mjs materialize --approval-file <file> --git-tag <tag>
    --message-output <file> --paths-output <file>`);
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

function runGit(args, { allowFailure = false } = {}) {
  const result = spawnSync('git', ['-C', repoRoot, ...args], {
    encoding: null,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.error) fail(`无法执行 git: ${result.error.message}`);
  if (result.status !== 0 && !allowFailure) {
    fail(Buffer.from(result.stderr ?? '').toString('utf8').trim() || `git ${args.join(' ')} 执行失败`);
  }
  return result;
}

function isGitRepo() {
  return runGit(['rev-parse', '--is-inside-work-tree'], { allowFailure: true }).status === 0;
}

function ensureGitRepo() {
  if (isGitRepo()) return;
  if (!fs.existsSync(path.join(repoRoot, '.gitignore'))) {
    fail('当前项目还不是 Git 仓库且缺少 .gitignore，拒绝创建首次发布审批。');
  }
  runGit(['init']);
  runGit(['checkout', '-B', process.env.PO_GITHUB_DEFAULT_BRANCH || 'main']);
}

function hasHead() {
  return runGit(['rev-parse', '--verify', 'HEAD'], { allowFailure: true }).status === 0;
}

function nullList(buffer) {
  return Buffer.from(buffer ?? '').toString('utf8').split('\0').filter(Boolean);
}

function trackedChangePaths() {
  if (!hasHead()) return [];
  return [...new Set([
    ...nullList(runGit(['diff', '--name-only', '-z', 'HEAD']).stdout),
    ...nullList(runGit(['diff', '--cached', '--name-only', '-z']).stdout),
  ])].sort();
}

function untrackedPaths() {
  return nullList(runGit(['ls-files', '--others', '--exclude-standard', '-z']).stdout).sort();
}

function normalizeRepoPath(value) {
  const normalized = value.trim().replaceAll('\\', '/');
  if (!normalized || path.isAbsolute(normalized) || normalized === '..' || normalized.startsWith('../') || normalized.includes('/../')) {
    fail(`非法提交路径: ${value}`);
  }
  return normalized.replace(/^\.\//, '');
}

function readPaths(filePath) {
  if (!fs.existsSync(filePath)) fail(`未找到提交文件清单: ${filePath}`);
  const paths = fs.readFileSync(filePath, 'utf8').split(/\r?\n/).filter((line) => line.trim()).map(normalizeRepoPath);
  if (new Set(paths).size !== paths.length) fail('提交文件清单包含重复路径。');
  return paths.sort();
}

function validateMessage(message) {
  const normalized = message.replaceAll('\r\n', '\n').trim();
  const lines = normalized.split('\n');
  const titleMatch = lines[0]?.match(new RegExp(`^(${allowedTypes})\\(([A-Za-z0-9._/-]+)\\): (\\S.+)$`));
  if (!titleMatch) {
    fail('提交标题必须使用 <type>(<scope>): <明确的实现结果>，并使用允许的 type。');
  }

  const fields = {};
  let previousIndex = 0;
  for (let fieldIndex = 0; fieldIndex < fieldLabels.length; fieldIndex += 1) {
    const label = fieldLabels[fieldIndex];
    const matches = lines.map((line, index) => line.startsWith(`${label}：`) ? index : -1).filter((index) => index >= 0);
    if (matches.length !== 1 || matches[0] <= previousIndex) fail(`提交正文必须按固定顺序包含且仅包含一次“${label}：”。`);
    const start = matches[0];
    const nextLabel = fieldLabels[fieldIndex + 1];
    const end = nextLabel ? lines.findIndex((line, index) => index > start && line.startsWith(`${nextLabel}：`)) : lines.length;
    fields[label] = [lines[start].slice(label.length + 1), ...lines.slice(start + 1, end)].join('\n').trim();
    previousIndex = start;
  }

  const hasMeaningfulValue = (value) => Boolean(value) && !/^(无|none|n\/a)$/i.test(value.trim());
  if (!hasMeaningfulValue(fields['问题/需求']) && !hasMeaningfulValue(fields['实现结果'])) {
    fail('“问题/需求”和“实现结果”至少填写一项有效内容。');
  }
  if (!fields['验证方式'] || !/`[^`\n]+`/.test(fields['验证方式']) || !/(结果|通过|成功|失败|exit\s*0|passed|failed)/i.test(fields['验证方式'])) {
    fail('“验证方式”必须包含反引号包裹的实际命令及明确结果。');
  }
  return normalized;
}

function workspaceFingerprint() {
  const paths = [...new Set([...trackedChangePaths(), ...untrackedPaths()])].sort();
  const hash = crypto.createHash('sha256');
  for (const relativePath of paths) {
    const absolutePath = path.join(repoRoot, relativePath);
    hash.update(relativePath);
    hash.update('\0');
    if (!fs.existsSync(absolutePath)) {
      hash.update('deleted');
    } else {
      const stat = fs.lstatSync(absolutePath);
      hash.update(`mode:${stat.mode}`);
      hash.update('\0');
      if (stat.isSymbolicLink()) {
        hash.update(`link:${fs.readlinkSync(absolutePath)}`);
      } else if (stat.isFile()) {
        hash.update(fs.readFileSync(absolutePath));
      } else {
        hash.update(`mode:${stat.mode}`);
      }
    }
    hash.update('\0');
  }
  return { hash: hash.digest('hex'), paths };
}

function readApproval(filePath, gitTag) {
  if (!fs.existsSync(filePath)) {
    fail(`缺少已确认的 Git 发布信息: ${filePath}。请先通过 Codex Skill 生成、编辑并确认提交信息。`);
  }
  const approval = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (approval.schemaVersion !== 1 || approval.confirmed !== true) fail('Git 发布确认文件无效或尚未确认。');
  if (approval.gitTag !== gitTag) fail('Git 发布确认对应的 tag 与当前 release plan 不一致，请重新确认。');
  validateMessage(approval.message);
  if (!Array.isArray(approval.approvedPaths)) fail('Git 发布确认文件缺少提交路径。');
  return approval;
}

function writePrivate(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, { mode: 0o600 });
  fs.chmodSync(filePath, 0o600);
}

const [command, ...rest] = process.argv.slice(2);
if (!command || command === '-h' || command === '--help') {
  usage();
  process.exit(command ? 0 : 1);
}
const args = parseArgs(rest);
const approvalFile = path.resolve(args['approval-file'] || defaultApprovalFile);

if (command === 'approve') {
  if (!args['message-file'] || !args['paths-file'] || !args['git-tag']) fail('approve 缺少 message-file、paths-file 或 git-tag。');
  ensureGitRepo();
  const message = validateMessage(fs.readFileSync(path.resolve(args['message-file']), 'utf8'));
  const approvedPaths = readPaths(path.resolve(args['paths-file']));
  const tracked = trackedChangePaths();
  const untracked = untrackedPaths();
  const approved = new Set(approvedPaths);
  const initialRepo = !hasHead();

  if (initialRepo) {
    if (args['allow-initial-all'] !== 'true') fail('首次建仓必须显式设置 --allow-initial-all true。');
    if (approvedPaths.length === 0) fail('首次建仓的确认清单不能为空。');
    const missing = untracked.filter((item) => !approved.has(item));
    const extra = approvedPaths.filter((item) => !untracked.includes(item));
    if (missing.length || extra.length) fail('首次建仓的确认清单必须与全部非忽略文件完全一致。');
  } else {
    const missingTracked = tracked.filter((item) => !approved.has(item));
    if (missingTracked.length) fail(`确认清单缺少已跟踪改动: ${missingTracked.join(', ')}`);
    const approvedUntracked = approvedPaths.filter((item) => untracked.includes(item));
    if (approvedUntracked.length && args['allow-untracked'] !== 'true') {
      fail('确认清单包含未跟踪文件，必须在用户明确确认后设置 --allow-untracked true。');
    }
    const valid = new Set([...tracked, ...(args['allow-untracked'] === 'true' ? untracked : [])]);
    const invalid = approvedPaths.filter((item) => !valid.has(item));
    if (invalid.length) fail(`确认清单包含无改动或未授权路径: ${invalid.join(', ')}`);
  }

  const fingerprint = workspaceFingerprint();
  writePrivate(approvalFile, `${JSON.stringify({
    schemaVersion: 1,
    confirmed: true,
    gitTag: args['git-tag'],
    message,
    approvedPaths,
    workspaceFingerprint: fingerprint.hash,
    workspacePaths: fingerprint.paths,
    approvedAt: new Date().toISOString(),
  }, null, 2)}\n`);
  console.log(`Git 发布信息已确认: ${approvalFile}`);
  process.exit(0);
}

if (command === 'verify') {
  if (!args['git-tag']) fail('verify 缺少 --git-tag。');
  ensureGitRepo();
  const approval = readApproval(approvalFile, args['git-tag']);
  const fingerprint = workspaceFingerprint();
  if (fingerprint.hash !== approval.workspaceFingerprint || JSON.stringify(fingerprint.paths) !== JSON.stringify(approval.workspacePaths)) {
    fail('确认后工作区或文件清单已变化，请重新生成并确认 Git 提交信息。');
  }
  console.log('Git 发布确认校验通过。');
  process.exit(0);
}

if (command === 'materialize') {
  if (!args['git-tag'] || !args['message-output'] || !args['paths-output']) {
    fail('materialize 缺少 git-tag、message-output 或 paths-output。');
  }
  const approval = readApproval(approvalFile, args['git-tag']);
  writePrivate(path.resolve(args['message-output']), `${approval.message}\n`);
  writePrivate(path.resolve(args['paths-output']), `${approval.approvedPaths.join('\n')}\n`);
  process.exit(0);
}

fail(`未知命令: ${command}`);
