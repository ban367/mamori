#!/bin/bash
set -euo pipefail
# 一般コメント取得
PR_ARG="${1:-}"
set +e
if [ -n "$PR_ARG" ]; then
  PR_NUM=$(gh pr view "$PR_ARG" --json number --jq '.number' 2>/dev/null)
else
  PR_NUM=$(gh pr view --json number --jq '.number' 2>/dev/null)
fi
set -e
if [ -z "$PR_NUM" ]; then
  if [ -n "$PR_ARG" ]; then
    echo "エラー: 引数 '${PR_ARG}' からプルリクエストを解決できませんでした。" >&2
  else
    echo "エラー: 現在のプルリクエストを解決できませんでした。PRブランチ上にいますか？" >&2
  fi
  exit 1
fi
REPO=$(gh repo view --json nameWithOwner --jq '.nameWithOwner')
gh api --paginate "repos/$REPO/issues/$PR_NUM/comments"
