#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
APP_DIR="${ROOT_DIR}/website"
DEPLOY_DIR="${ROOT_DIR}/deploy/aliyun"
RELEASE_DIR="${DEPLOY_DIR}/release"
PROJECT_NAME="digital-product-consultant-site"
RELEASE_TYPE_ZH="${1:-${PO_RELEASE_TYPE_ZH:-}}"
STAMP="${2:-$(date +%Y%m%d-%H%M%S)}"
ARTIFACT="${RELEASE_DIR}/${PROJECT_NAME}-${STAMP}.tgz"
VERSION_PLAN_FILE="${ARTIFACT%.tgz}.version-plan.json"
STAGE_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "${STAGE_DIR}"
}
trap cleanup EXIT

fail() {
  echo "$1" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "缺少命令: $1"
}

case "${RELEASE_TYPE_ZH}" in
  大改版|新功能|修复优化) ;;
  *) fail "发布类型必须是：大改版 / 新功能 / 修复优化" ;;
esac

[[ "${STAMP}" =~ ^[0-9]{8}-[0-9]{6}$ ]] || fail "时间戳格式必须为 YYYYMMDD-HHMMSS"

require_cmd node
require_cmd npm
require_cmd tar

mkdir -p "${RELEASE_DIR}"

node "${SCRIPT_DIR}/manage_release_version.mjs" plan \
  --release-type-zh "${RELEASE_TYPE_ZH}" \
  --output "${VERSION_PLAN_FILE}"

RELEASE_DISPLAY_VERSION="$(node -e 'const fs=require("fs"); const plan=JSON.parse(fs.readFileSync(process.argv[1], "utf8")); process.stdout.write(plan.displayVersion);' "${VERSION_PLAN_FILE}")"
cd "${APP_DIR}"
NEXT_PUBLIC_RELEASE_VERSION="${RELEASE_DISPLAY_VERSION}" npm run build

[[ -f dist/server/index.js ]] || fail "构建产物缺失: dist/server/index.js"
[[ -f dist/client/vinext-client-entry-manifest.json ]] || fail "构建产物缺失: dist/client/vinext-client-entry-manifest.json"
[[ -f package-lock.json ]] || fail "缺少 package-lock.json，无法锁定远端依赖"

mkdir -p \
  "${STAGE_DIR}/deploy/aliyun" \
  "${STAGE_DIR}/web"

cp "${APP_DIR}/package.json" "${APP_DIR}/package-lock.json" "${STAGE_DIR}/"
cp -R dist "${STAGE_DIR}/dist"
cp -R dist/client/. "${STAGE_DIR}/web/"
cp -R "${DEPLOY_DIR}/env" "${STAGE_DIR}/deploy/aliyun/env"
cp -R "${DEPLOY_DIR}/nginx" "${STAGE_DIR}/deploy/aliyun/nginx"
cp -R "${DEPLOY_DIR}/systemd" "${STAGE_DIR}/deploy/aliyun/systemd"
cp -R "${DEPLOY_DIR}/scripts" "${STAGE_DIR}/deploy/aliyun/scripts"
cp "${DEPLOY_DIR}/.deploy.local.example.sh" "${STAGE_DIR}/deploy/aliyun/"
cp "${VERSION_PLAN_FILE}" "${STAGE_DIR}/deploy/aliyun/release-plan.json"

chmod +x "${STAGE_DIR}/deploy/aliyun/scripts/"*.sh
tar -czf "${ARTIFACT}" -C "${STAGE_DIR}" .

echo "发布包已生成: ${ARTIFACT}"
echo "版本计划已生成: ${VERSION_PLAN_FILE}"
echo "下一步: deploy/aliyun/scripts/deploy_release.sh ${STAMP}"
