#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const allowedReleaseTypes = new Set(['大改版', '新功能', '修复优化']);
const allowedStatuses = new Set(['online', 'pending']);

function fail(message) {
  console.error(message);
  process.exit(1);
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value == null || value.startsWith('--')) fail(`参数无效: ${key ?? ''}`);
    result[key.slice(2)] = value;
  }
  return result;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function emptyRegistry() {
  return { schemaVersion: 1, updatedAt: new Date(0).toISOString(), services: {} };
}

function readRegistry(filePath) {
  if (!fs.existsSync(filePath)) return emptyRegistry();
  const registry = readJson(filePath);
  if (registry.schemaVersion !== 1 || !registry.services || Array.isArray(registry.services) || typeof registry.services !== 'object') fail(`版本登记文件格式无效: ${filePath}`);
  return registry;
}

function writeAtomic(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o644 });
  fs.renameSync(temporaryPath, filePath);
}

function mergeHistory(primary = [], secondary = []) {
  const seen = new Set();
  return [...primary, ...secondary].filter((release) => {
    const key = release.gitTag || `${release.displayVersion}:${release.releasedAt}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((left, right) => String(right.releasedAt).localeCompare(String(left.releasedAt)));
}

function seedRegistry(registryPath, seedPath) {
  const registry = readRegistry(registryPath);
  const seed = readJson(seedPath);
  if (seed.schemaVersion !== 1 || !seed.services || Array.isArray(seed.services) || typeof seed.services !== 'object') fail(`历史版本种子格式无效: ${seedPath}`);
  const services = { ...registry.services };
  for (const [serviceId, seededService] of Object.entries(seed.services)) {
    const current = services[serviceId];
    services[serviceId] = current
      ? {
          ...seededService,
          ...current,
          history: mergeHistory(current.history, seededService.history),
        }
      : seededService;
  }
  writeAtomic(registryPath, {
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    services,
  });
}

function recordRelease(registryPath, args) {
  const required = ['service-id', 'name', 'canonical-url', 'display-version', 'git-tag', 'release-type-zh'];
  for (const key of required) if (!args[key]) fail(`record 缺少 --${key}`);
  if (!allowedReleaseTypes.has(args['release-type-zh'])) fail('发布类型只支持：大改版 / 新功能 / 修复优化');
  const status = args.status ?? 'online';
  if (!allowedStatuses.has(status)) fail('状态只支持 online / pending');

  const registry = readRegistry(registryPath);
  const releasedAt = args['released-at'] ?? new Date().toISOString();
  const release = {
    displayVersion: args['display-version'],
    gitTag: args['git-tag'],
    releaseTypeZh: args['release-type-zh'],
    releasedAt,
  };
  const previous = registry.services[args['service-id']] ?? null;
  const service = {
    name: args.name,
    canonicalUrl: args['canonical-url'],
    status,
    current: release,
    history: mergeHistory([release], previous?.history),
  };
  registry.services[args['service-id']] = service;
  if (args['retire-service-id'] && args['retire-service-id'] !== args['service-id']) {
    delete registry.services[args['retire-service-id']];
  }
  registry.updatedAt = releasedAt;
  writeAtomic(registryPath, registry);
}

function retireService(registryPath, args) {
  if (!args['service-id']) fail('retire 缺少 --service-id');
  const registry = readRegistry(registryPath);
  if (!(args['service-id'] in registry.services)) return;
  delete registry.services[args['service-id']];
  registry.updatedAt = new Date().toISOString();
  writeAtomic(registryPath, registry);
}

const [command, ...rest] = process.argv.slice(2);
const args = parseArgs(rest);
const registryPath = args.registry ? path.resolve(args.registry) : null;
if (!registryPath) fail('缺少 --registry');

if (command === 'seed') {
  if (!args.seed) fail('seed 缺少 --seed');
  seedRegistry(registryPath, path.resolve(args.seed));
} else if (command === 'record') {
  recordRelease(registryPath, args);
} else if (command === 'retire') {
  retireService(registryPath, args);
} else {
  fail('用法: manage_service_release_registry.mjs <seed|record|retire> --registry <file> ...');
}
