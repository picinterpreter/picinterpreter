#!/usr/bin/env bash

set -euo pipefail

ENV_FILE="${1:-.env.local}"
SECRET_NAME="${2:-DEPLOY_ENV_FILE}"
ENV_NAME="${3:-}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "错误: 环境文件不存在: $ENV_FILE" >&2
  exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "错误: 未找到 gh 命令，请先安装 GitHub CLI" >&2
  exit 1
fi

if [[ -n "$ENV_NAME" ]]; then
  echo "同步 $ENV_FILE -> environment secret $SECRET_NAME ($ENV_NAME)"
  gh secret set "$SECRET_NAME" --env "$ENV_NAME" < "$ENV_FILE"
else
  echo "同步 $ENV_FILE -> repo secret $SECRET_NAME"
  gh secret set "$SECRET_NAME" < "$ENV_FILE"
fi
echo "已完成"
