#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
DEPLOY_DIR="${ROOT_DIR}/deploy/aliyun"
RELEASE_DIR="${DEPLOY_DIR}/release"
PROJECT_NAME="digital-product-consultant-site"
DEPLOY_ENV_FILE="${PO_DEPLOY_ENV_FILE:-${DEPLOY_DIR}/.deploy.local.sh}"
STAMP="${1:-}"
TMP_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "${TMP_DIR}"
}
trap cleanup EXIT

fail() {
  echo "$1" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "缺少命令: $1"
}

require_env() {
  local name="$1"
  [[ -n "${!name:-}" ]] || fail "缺少部署变量: ${name}"
}

shell_assignment() {
  printf '%s=%q\n' "$1" "$2"
}

latest_artifact() {
  local artifacts=()
  shopt -s nullglob
  artifacts=("${RELEASE_DIR}/${PROJECT_NAME}-"*.tgz)
  shopt -u nullglob
  [[ ${#artifacts[@]} -gt 0 ]] || return 0
  ls -1t "${artifacts[@]}" | head -n 1
}

artifact_has_path() {
  local artifact="$1"
  local required="$2"
  # Do not use grep -q here: with pipefail it closes the pipe after the first
  # match and tar can be reported as SIGPIPE even though the entry exists.
  tar -tzf "${artifact}" | sed 's#^\./##' | grep -Fx -- "${required}" >/dev/null
}

validate_artifact() {
  local artifact="$1"
  local required_paths=(
    "package.json"
    "package-lock.json"
    "dist/server/index.js"
    "dist/client/vinext-client-entry-manifest.json"
    "web/vinext-client-entry-manifest.json"
    "deploy/aliyun/env/api.env.example"
    "deploy/aliyun/nginx/digital-product-consultant-site.conf"
    "deploy/aliyun/systemd/digital-product-consultant-site.service"
    "deploy/aliyun/scripts/start-prod.sh"
    "deploy/aliyun/scripts/server-bootstrap.sh"
    "deploy/aliyun/scripts/manage_service_release_registry.mjs"
    "deploy/aliyun/scripts/manage_git_release_commit.mjs"
    "deploy/aliyun/release-plan.json"
  )
  local required
  for required in "${required_paths[@]}"; do
    artifact_has_path "${artifact}" "${required}" || fail "发布包缺少: ${required}"
  done
}

run_scp() {
  local source_path="$1"
  local remote_path="$2"
  if [[ -n "${PO_SSH_PASSWORD:-}" ]]; then
    require_cmd expect
    DEPLOY_HOST="${PO_DEPLOY_HOST}" \
    DEPLOY_USER="${PO_DEPLOY_USER}" \
    DEPLOY_PORT="${PO_DEPLOY_PORT}" \
    SSH_PASSWORD="${PO_SSH_PASSWORD}" \
    SOURCE_PATH="${source_path}" \
    REMOTE_PATH="${remote_path}" \
    expect <<'EXPECT_EOF'
set timeout -1
spawn scp -P $env(DEPLOY_PORT) -o StrictHostKeyChecking=accept-new $env(SOURCE_PATH) "$env(DEPLOY_USER)@$env(DEPLOY_HOST):$env(REMOTE_PATH)"
expect {
  -re {.*yes/no.*} { send "yes\r"; exp_continue }
  -re {.*[Pp]assword:.*} { send "$env(SSH_PASSWORD)\r"; exp_continue }
  eof
}
catch wait result
exit [lindex $result 3]
EXPECT_EOF
  else
    scp -P "${PO_DEPLOY_PORT}" -o StrictHostKeyChecking=accept-new \
      "${source_path}" "${PO_DEPLOY_USER}@${PO_DEPLOY_HOST}:${remote_path}"
  fi
}

run_ssh() {
  local remote_command="$1"
  if [[ -n "${PO_SSH_PASSWORD:-}" ]]; then
    require_cmd expect
    DEPLOY_HOST="${PO_DEPLOY_HOST}" \
    DEPLOY_USER="${PO_DEPLOY_USER}" \
    DEPLOY_PORT="${PO_DEPLOY_PORT}" \
    SSH_PASSWORD="${PO_SSH_PASSWORD}" \
    REMOTE_COMMAND="${remote_command}" \
    expect <<'EXPECT_EOF'
set timeout -1
spawn ssh -tt -p $env(DEPLOY_PORT) -o StrictHostKeyChecking=accept-new "$env(DEPLOY_USER)@$env(DEPLOY_HOST)" $env(REMOTE_COMMAND)
expect {
  -re {.*yes/no.*} { send "yes\r"; exp_continue }
  -re {.*[Pp]assword:.*} { send "$env(SSH_PASSWORD)\r"; exp_continue }
  -re {.*\[sudo\].*[Pp]assword.*} { send "$env(SSH_PASSWORD)\r"; exp_continue }
  eof
}
catch wait result
exit [lindex $result 3]
EXPECT_EOF
  else
    ssh -p "${PO_DEPLOY_PORT}" -o StrictHostKeyChecking=accept-new \
      "${PO_DEPLOY_USER}@${PO_DEPLOY_HOST}" "${remote_command}"
  fi
}

[[ -f "${DEPLOY_ENV_FILE}" ]] || fail "缺少 ${DEPLOY_ENV_FILE}；请复制 .deploy.local.example.sh 后填写服务器信息"
# shellcheck source=/dev/null
source "${DEPLOY_ENV_FILE}"

PO_DEPLOY_PORT="${PO_DEPLOY_PORT:-22}"
PO_SSH_PASSWORD="${PO_SSH_PASSWORD:-}"
PO_REMOTE_ROOT="${PO_REMOTE_ROOT:-/service/digital-product-consultant-site}"
PO_REMOTE_CURRENT_DIR="${PO_REMOTE_CURRENT_DIR:-${PO_REMOTE_ROOT}/current}"
PO_REMOTE_RELEASES_DIR="${PO_REMOTE_RELEASES_DIR:-${PO_REMOTE_ROOT}/releases}"
PO_REMOTE_SHARED_DIR="${PO_REMOTE_SHARED_DIR:-${PO_REMOTE_ROOT}/shared}"
PO_REMOTE_DATA_DIR="${PO_REMOTE_DATA_DIR:-${PO_REMOTE_ROOT}/data}"
PO_REMOTE_UPLOADS_DIR="${PO_REMOTE_UPLOADS_DIR:-${PO_REMOTE_ROOT}/uploads}"
PO_REMOTE_LOG_DIR="${PO_REMOTE_LOG_DIR:-${PO_REMOTE_ROOT}/logs}"
PO_REMOTE_ENV_DIR="${PO_REMOTE_ENV_DIR:-/etc/digital-product-consultant-site}"
PO_REMOTE_ENV_FILE="${PO_REMOTE_ENV_FILE:-${PO_REMOTE_ENV_DIR}/digital-product-consultant-site.env}"
PO_REMOTE_SERVICE_NAME="${PO_REMOTE_SERVICE_NAME:-digital-product-consultant-site.service}"
PO_REMOTE_NGINX_CONF="${PO_REMOTE_NGINX_CONF:-/etc/nginx/conf.d/digital-product-consultant-site.conf}"
PO_REMOTE_WEB_DIR="${PO_REMOTE_WEB_DIR:-${PO_REMOTE_ROOT}/web}"
PO_REMOTE_RUN_USER="${PO_REMOTE_RUN_USER:-${PO_DEPLOY_USER:-root}}"
PO_REMOTE_RELEASE_KEEP_COUNT="${PO_REMOTE_RELEASE_KEEP_COUNT:-2}"
PO_HEALTHCHECK_URL="${PO_HEALTHCHECK_URL:-http://127.0.0.1:8015/skills/digital-product-consultant/site/}"
PO_RELEASE_REGISTRY_PATH="${PO_RELEASE_REGISTRY_PATH:-/service/igoodthings/shared/service-releases.json}"

require_env PO_DEPLOY_HOST
require_env PO_DEPLOY_USER
[[ "${PO_DEPLOY_PORT}" =~ ^[0-9]+$ ]] || fail "PO_DEPLOY_PORT 必须是数字"
if ! [[ "${PO_REMOTE_RELEASE_KEEP_COUNT}" =~ ^[0-9]+$ ]] || [[ "${PO_REMOTE_RELEASE_KEEP_COUNT}" -lt 1 ]]; then
  PO_REMOTE_RELEASE_KEEP_COUNT=2
fi

require_cmd node
require_cmd scp
require_cmd ssh
require_cmd tar

if [[ -n "${STAMP}" ]]; then
  [[ "${STAMP}" =~ ^[0-9]{8}-[0-9]{6}$ ]] || fail "时间戳格式必须为 YYYYMMDD-HHMMSS"
  ARTIFACT="${RELEASE_DIR}/${PROJECT_NAME}-${STAMP}.tgz"
else
  ARTIFACT="$(latest_artifact)"
fi

[[ -n "${ARTIFACT:-}" && -f "${ARTIFACT}" ]] || fail "未找到发布包，请先运行 package_release.sh"
VERSION_PLAN_FILE="${ARTIFACT%.tgz}.version-plan.json"
[[ -f "${VERSION_PLAN_FILE}" ]] || fail "缺少版本计划: ${VERSION_PLAN_FILE}"
validate_artifact "${ARTIFACT}"
RELEASE_GIT_TAG="$(node -e 'const fs=require("fs"); const plan=JSON.parse(fs.readFileSync(process.argv[1], "utf8")); process.stdout.write(plan.gitTag);' "${VERSION_PLAN_FILE}")"
RELEASE_DISPLAY_VERSION="$(node -e 'const fs=require("fs"); const plan=JSON.parse(fs.readFileSync(process.argv[1], "utf8")); process.stdout.write(plan.displayVersion);' "${VERSION_PLAN_FILE}")"
RELEASE_TYPE_ZH="$(node -e 'const fs=require("fs"); const plan=JSON.parse(fs.readFileSync(process.argv[1], "utf8")); process.stdout.write(plan.releaseTypeZh);' "${VERSION_PLAN_FILE}")"
GIT_APPROVAL_FILE="${PO_GIT_RELEASE_APPROVAL_FILE:-${DEPLOY_DIR}/.git-release-approval.local.json}"
node "${SCRIPT_DIR}/manage_git_release_commit.mjs" verify \
  --approval-file "${GIT_APPROVAL_FILE}" \
  --git-tag "${RELEASE_GIT_TAG}"

RELEASE_NAME="$(basename "${ARTIFACT}" .tgz)"
[[ "${RELEASE_NAME}" =~ ^digital-product-consultant-site-[0-9]{8}-[0-9]{6}$ ]] || fail "发布包名称不安全: ${RELEASE_NAME}"
REMOTE_ARTIFACT="/tmp/$(basename "${ARTIFACT}")"
REMOTE_ENV_EXAMPLE="/tmp/digital-product-consultant-site.env.example"
REMOTE_SERVICE_FILE="/tmp/digital-product-consultant-site.service"
REMOTE_NGINX_FILE="/tmp/digital-product-consultant-site.conf"
REMOTE_SCRIPT_FILE="/tmp/${RELEASE_NAME}-deploy.sh"
LOCAL_REMOTE_SCRIPT="${TMP_DIR}/remote-deploy.sh"

{
  echo '#!/usr/bin/env bash'
  echo 'set -euo pipefail'
  shell_assignment REMOTE_ROOT "${PO_REMOTE_ROOT}"
  shell_assignment REMOTE_CURRENT_DIR "${PO_REMOTE_CURRENT_DIR}"
  shell_assignment REMOTE_RELEASES_DIR "${PO_REMOTE_RELEASES_DIR}"
  shell_assignment REMOTE_SHARED_DIR "${PO_REMOTE_SHARED_DIR}"
  shell_assignment REMOTE_DATA_DIR "${PO_REMOTE_DATA_DIR}"
  shell_assignment REMOTE_UPLOADS_DIR "${PO_REMOTE_UPLOADS_DIR}"
  shell_assignment REMOTE_LOG_DIR "${PO_REMOTE_LOG_DIR}"
  shell_assignment REMOTE_ENV_DIR "${PO_REMOTE_ENV_DIR}"
  shell_assignment REMOTE_ENV_FILE "${PO_REMOTE_ENV_FILE}"
  shell_assignment REMOTE_SERVICE_NAME "${PO_REMOTE_SERVICE_NAME}"
  shell_assignment REMOTE_NGINX_CONF "${PO_REMOTE_NGINX_CONF}"
  shell_assignment REMOTE_WEB_DIR "${PO_REMOTE_WEB_DIR}"
  shell_assignment REMOTE_RUN_USER "${PO_REMOTE_RUN_USER}"
  shell_assignment REMOTE_RELEASE_KEEP_COUNT "${PO_REMOTE_RELEASE_KEEP_COUNT}"
  shell_assignment HEALTHCHECK_URL "${PO_HEALTHCHECK_URL}"
  shell_assignment REMOTE_ARTIFACT "${REMOTE_ARTIFACT}"
  shell_assignment REMOTE_ENV_EXAMPLE "${REMOTE_ENV_EXAMPLE}"
  shell_assignment REMOTE_SERVICE_FILE "${REMOTE_SERVICE_FILE}"
  shell_assignment REMOTE_NGINX_FILE "${REMOTE_NGINX_FILE}"
  shell_assignment REMOTE_RELEASE_DIR "${PO_REMOTE_RELEASES_DIR}/${RELEASE_NAME}"
  shell_assignment RELEASE_REGISTRY_PATH "${PO_RELEASE_REGISTRY_PATH}"
  shell_assignment RELEASE_DISPLAY_VERSION "${RELEASE_DISPLAY_VERSION}"
  shell_assignment RELEASE_GIT_TAG "${RELEASE_GIT_TAG}"
  shell_assignment RELEASE_TYPE_ZH "${RELEASE_TYPE_ZH}"
  cat <<'REMOTE_BODY'

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || { echo "服务器缺少命令: $1" >&2; exit 1; }
}

require_cmd curl
require_cmd nginx
require_cmd node
require_cmd npm
require_cmd tar

PREVIOUS_CURRENT="$(readlink -f "${REMOTE_CURRENT_DIR}" 2>/dev/null || true)"
SWITCHED=0

rollback() {
  local exit_code=$?
  if [[ "${SWITCHED}" -eq 1 ]]; then
    if [[ -n "${PREVIOUS_CURRENT}" && -d "${PREVIOUS_CURRENT}" ]]; then
      sudo ln -sfn "${PREVIOUS_CURRENT}" "${REMOTE_CURRENT_DIR}"
      sudo systemctl restart "${REMOTE_SERVICE_NAME}" || true
    else
      sudo rm -f "${REMOTE_CURRENT_DIR}"
      sudo systemctl stop "${REMOTE_SERVICE_NAME}" || true
    fi
  fi
  echo "部署失败，已尝试恢复上一个 current" >&2
  exit "${exit_code}"
}
trap rollback ERR

sudo mkdir -p "${REMOTE_RELEASES_DIR}"
sudo rm -rf "${REMOTE_RELEASE_DIR}"
sudo mkdir -p "${REMOTE_RELEASE_DIR}"
sudo tar -xzf "${REMOTE_ARTIFACT}" -C "${REMOTE_RELEASE_DIR}"
sudo chown -R "${REMOTE_RUN_USER}:${REMOTE_RUN_USER}" "${REMOTE_RELEASE_DIR}"

bash "${REMOTE_RELEASE_DIR}/deploy/aliyun/scripts/server-bootstrap.sh" \
  "${REMOTE_ROOT}" "${REMOTE_RUN_USER}" "${REMOTE_ENV_DIR}"

cd "${REMOTE_RELEASE_DIR}"
npm ci --include=dev --ignore-scripts
chmod +x deploy/aliyun/scripts/*.sh

sudo install -m 640 "${REMOTE_ENV_EXAMPLE}" "${REMOTE_ENV_FILE}.example"
if [[ ! -f "${REMOTE_ENV_FILE}" ]]; then
  sudo install -m 600 "${REMOTE_ENV_EXAMPLE}" "${REMOTE_ENV_FILE}"
  echo "首次部署：已由示例创建 ${REMOTE_ENV_FILE}，请按需补充真实配置。"
fi

sudo install -m 644 "${REMOTE_SERVICE_FILE}" "/etc/systemd/system/${REMOTE_SERVICE_NAME}"
sudo install -m 644 "${REMOTE_NGINX_FILE}" "${REMOTE_NGINX_CONF}"
sudo nginx -t
sudo systemctl daemon-reload
sudo systemctl enable "${REMOTE_SERVICE_NAME}" >/dev/null
sudo ln -sfn "${REMOTE_RELEASE_DIR}" "${REMOTE_CURRENT_DIR}"
SWITCHED=1
sudo systemctl restart "${REMOTE_SERVICE_NAME}"

for _ in {1..30}; do
  if sudo systemctl is-active --quiet "${REMOTE_SERVICE_NAME}"; then
    break
  fi
  sleep 2
done
sudo systemctl is-active --quiet "${REMOTE_SERVICE_NAME}"

if [[ -n "${HEALTHCHECK_URL}" ]]; then
  for _ in {1..30}; do
    if curl -fsS "${HEALTHCHECK_URL}" >/dev/null; then
      break
    fi
    sleep 2
  done
  curl -fsS "${HEALTHCHECK_URL}" >/dev/null
fi

sudo mkdir -p "${REMOTE_WEB_DIR}"
sudo find "${REMOTE_WEB_DIR}" -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +
sudo cp -R "${REMOTE_CURRENT_DIR}/web/." "${REMOTE_WEB_DIR}/"
sudo nginx -t
sudo systemctl reload nginx

mapfile -t OLD_RELEASES < <(
  find "${REMOTE_RELEASES_DIR}" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' \
    | sort -nr \
    | tail -n "+$((REMOTE_RELEASE_KEEP_COUNT + 1))" \
    | cut -d' ' -f2-
)
if [[ ${#OLD_RELEASES[@]} -gt 0 ]]; then
  printf '清理旧 release: %s\n' "${OLD_RELEASES[@]}"
  sudo rm -rf -- "${OLD_RELEASES[@]}"
fi

node "${REMOTE_CURRENT_DIR}/deploy/aliyun/scripts/manage_service_release_registry.mjs" record \
  --registry "${RELEASE_REGISTRY_PATH}" \
  --service-id digital-product-consultant \
  --name "零售数字化与 AI 产品顾问" \
  --canonical-url "https://igoodthings.qiaokiai.com/skills/digital-product-consultant/site/" \
  --display-version "${RELEASE_DISPLAY_VERSION}" \
  --git-tag "${RELEASE_GIT_TAG}" \
  --release-type-zh "${RELEASE_TYPE_ZH}" \
  --status online

sudo rm -f "${REMOTE_ARTIFACT}" "${REMOTE_ENV_EXAMPLE}" "${REMOTE_SERVICE_FILE}" "${REMOTE_NGINX_FILE}"
SWITCHED=0
trap - ERR
echo "远端部署成功: ${REMOTE_RELEASE_DIR}"
REMOTE_BODY
} > "${LOCAL_REMOTE_SCRIPT}"
chmod +x "${LOCAL_REMOTE_SCRIPT}"

echo "[digital-product-consultant-site] 上传并部署 ${RELEASE_NAME}..."
run_scp "${ARTIFACT}" "${REMOTE_ARTIFACT}"
run_scp "${DEPLOY_DIR}/env/api.env.example" "${REMOTE_ENV_EXAMPLE}"
run_scp "${DEPLOY_DIR}/systemd/digital-product-consultant-site.service" "${REMOTE_SERVICE_FILE}"
run_scp "${DEPLOY_DIR}/nginx/digital-product-consultant-site.conf" "${REMOTE_NGINX_FILE}"
run_scp "${LOCAL_REMOTE_SCRIPT}" "${REMOTE_SCRIPT_FILE}"
run_ssh "bash ${REMOTE_SCRIPT_FILE}"

VERSION_ENV_OUTPUT="$(node "${SCRIPT_DIR}/manage_release_version.mjs" apply \
  --plan-file "${VERSION_PLAN_FILE}" \
  --format env)"
eval "${VERSION_ENV_OUTPUT}"

bash "${SCRIPT_DIR}/sync_git_release.sh" \
  --git-tag "${RELEASE_GIT_TAG}" \
  --display-version "${RELEASE_DISPLAY_VERSION}" \
  --release-type-zh "${RELEASE_TYPE_ZH}" \
  --approval-file "${PO_GIT_RELEASE_APPROVAL_FILE:-${DEPLOY_DIR}/.git-release-approval.local.json}"

echo "[digital-product-consultant-site] 发布完成: ${RELEASE_DISPLAY_VERSION}"
