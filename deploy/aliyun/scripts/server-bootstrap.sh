#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="${1:-/service/digital-product-consultant-site}"
RUN_USER="${2:-root}"
ENV_DIR="${3:-/etc/digital-product-consultant-site}"

sudo mkdir -p \
  "${PROJECT_ROOT}/releases" \
  "${PROJECT_ROOT}/shared" \
  "${PROJECT_ROOT}/data" \
  "${PROJECT_ROOT}/uploads" \
  "${PROJECT_ROOT}/logs" \
  "${PROJECT_ROOT}/web" \
  "${ENV_DIR}"

sudo touch \
  "${PROJECT_ROOT}/logs/app.stdout.log" \
  "${PROJECT_ROOT}/logs/app.stderr.log"

sudo chown -R "${RUN_USER}:${RUN_USER}" "${PROJECT_ROOT}"
sudo chmod 750 "${ENV_DIR}"

echo "digital-product-consultant-site 服务器目录已初始化: ${PROJECT_ROOT}"
