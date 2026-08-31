#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  sync_git_release.sh --git-tag <tag> --display-version <version> --release-type-zh <type> \
    --approval-file <file>
USAGE
}

fail() {
  echo "$1" >&2
  exit 1
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    fail "缺少命令: $1"
  fi
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
REMOTE_NAME="${PO_GITHUB_REMOTE_NAME:-origin}"
REPO_NAME="${PO_GITHUB_REPO_NAME:-$(basename "$ROOT_DIR")}"
VISIBILITY="${PO_GITHUB_VISIBILITY:-private}"
DEFAULT_BRANCH="${PO_GITHUB_DEFAULT_BRANCH:-main}"
GIT_TAG=""
DISPLAY_VERSION=""
RELEASE_TYPE_ZH=""
APPROVAL_FILE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --git-tag) GIT_TAG="$2"; shift 2 ;;
    --display-version) DISPLAY_VERSION="$2"; shift 2 ;;
    --release-type-zh) RELEASE_TYPE_ZH="$2"; shift 2 ;;
    --approval-file) APPROVAL_FILE="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *)
      fail "未知参数: $1"
      ;;
  esac
done

if [[ -z "$GIT_TAG" || -z "$DISPLAY_VERSION" || -z "$RELEASE_TYPE_ZH" || -z "$APPROVAL_FILE" ]]; then
  usage >&2
  exit 1
fi

require_cmd git

ensure_git_repo() {
  if git -C "$ROOT_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    return
  fi

  if [[ ! -f "$ROOT_DIR/.gitignore" ]]; then
    fail "当前项目还不是 git 仓，且缺少 .gitignore。请先补 .gitignore 再重试。"
  fi

  git -C "$ROOT_DIR" init >/dev/null
  git -C "$ROOT_DIR" checkout -B "$DEFAULT_BRANCH" >/dev/null 2>&1
}

ensure_current_branch() {
  local branch
  branch="$(git -C "$ROOT_DIR" branch --show-current 2>/dev/null || true)"
  if [[ -z "$branch" || "$branch" == "HEAD" ]]; then
    git -C "$ROOT_DIR" checkout -B "$DEFAULT_BRANCH" >/dev/null 2>&1
    branch="$DEFAULT_BRANCH"
  fi
  printf '%s' "$branch"
}

ensure_remote() {
  if git -C "$ROOT_DIR" remote get-url "$REMOTE_NAME" >/dev/null 2>&1; then
    return
  fi

  require_cmd gh
  if ! gh auth status >/dev/null 2>&1; then
    fail "GitHub CLI 尚未认证，请先执行 gh auth login。"
  fi

  case "$VISIBILITY" in
    private|public|internal) ;;
    *)
      fail "PO_GITHUB_VISIBILITY 仅支持 private / public / internal"
      ;;
  esac

  gh repo create "$REPO_NAME" --"$VISIBILITY" --source "$ROOT_DIR" --remote "$REMOTE_NAME" >/dev/null
}

ensure_git_repo
BRANCH_NAME="$(ensure_current_branch)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
MESSAGE_FILE="$TMP_DIR/commit-message.txt"
PATHS_FILE="$TMP_DIR/approved-paths.txt"

node "$SCRIPT_DIR/manage_git_release_commit.mjs" materialize \
  --approval-file "$APPROVAL_FILE" \
  --git-tag "$GIT_TAG" \
  --message-output "$MESSAGE_FILE" \
  --paths-output "$PATHS_FILE"

APPROVED_PATHS=()
while IFS= read -r approved_path; do
  [[ -n "$approved_path" ]] && APPROVED_PATHS+=("$approved_path")
done < "$PATHS_FILE"
if [[ "${#APPROVED_PATHS[@]}" -gt 0 ]]; then
  git -C "$ROOT_DIR" add -- "${APPROVED_PATHS[@]}"
fi
git -C "$ROOT_DIR" add -- website/package.json website/package-lock.json website/release-version.json

while IFS= read -r -d '' staged_path; do
  allowed=0
  if [[ "$staged_path" == "website/package.json" || "$staged_path" == "website/package-lock.json" || "$staged_path" == "website/release-version.json" ]]; then
    allowed=1
  else
    for approved_path in "${APPROVED_PATHS[@]}"; do
      if [[ "$staged_path" == "$approved_path" ]]; then allowed=1; break; fi
    done
  fi
  [[ "$allowed" -eq 1 ]] || fail "暂存区包含未经确认的文件: $staged_path"
done < <(git -C "$ROOT_DIR" diff --cached --name-only -z)

git -C "$ROOT_DIR" diff --cached --quiet && fail "没有可提交的已确认改动。"
git -C "$ROOT_DIR" commit -F "$MESSAGE_FILE" >/dev/null

BRANCH_NAME="$(ensure_current_branch)"
ensure_remote

if ! git -C "$ROOT_DIR" rev-parse "$GIT_TAG" >/dev/null 2>&1; then
  git -C "$ROOT_DIR" tag -a "$GIT_TAG" -m "Release ${DISPLAY_VERSION}" >/dev/null
fi

git -C "$ROOT_DIR" push -u "$REMOTE_NAME" "$BRANCH_NAME"
git -C "$ROOT_DIR" push "$REMOTE_NAME" "$GIT_TAG"

rm -f "$APPROVAL_FILE"
echo "GitHub 已同步: ${DISPLAY_VERSION} (${GIT_TAG})"
