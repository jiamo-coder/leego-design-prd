#!/usr/bin/env bash

# Copy to .deploy.local.sh and fill only local connection details.
export PO_DEPLOY_HOST=""
export PO_DEPLOY_USER="root"
export PO_DEPLOY_PORT="22"
export PO_SSH_PASSWORD=""

export PO_REMOTE_ROOT="/service/leego-design-prd-site"
export PO_REMOTE_CURRENT_DIR="$PO_REMOTE_ROOT/current"
export PO_REMOTE_RELEASES_DIR="$PO_REMOTE_ROOT/releases"
export PO_REMOTE_SHARED_DIR="$PO_REMOTE_ROOT/shared"
export PO_REMOTE_DATA_DIR="$PO_REMOTE_ROOT/data"
export PO_REMOTE_UPLOADS_DIR="$PO_REMOTE_ROOT/uploads"
export PO_REMOTE_LOG_DIR="$PO_REMOTE_ROOT/logs"
export PO_REMOTE_ENV_DIR="/etc/leego-design-prd-site"
export PO_REMOTE_ENV_FILE="$PO_REMOTE_ENV_DIR/leego-design-prd-site.env"
export PO_REMOTE_SERVICE_NAME="leego-design-prd-site.service"
export PO_REMOTE_NGINX_CONF="/etc/nginx/conf.d/leego-design-prd-site.conf"
export PO_REMOTE_WEB_DIR="$PO_REMOTE_ROOT/web"
export PO_REMOTE_RUN_USER="$PO_DEPLOY_USER"
export PO_REMOTE_RELEASE_KEEP_COUNT="2"
export PO_HEALTHCHECK_URL="http://127.0.0.1:8015/skills/leego-design-prd/site/"
export PO_RELEASE_REGISTRY_PATH="/service/igoodthings/shared/service-releases.json"

export PO_GITHUB_REMOTE_NAME="origin"
export PO_GITHUB_REPO_NAME="leego-design-prd"
export PO_GITHUB_VISIBILITY="private"
export PO_GITHUB_DEFAULT_BRANCH="main"
