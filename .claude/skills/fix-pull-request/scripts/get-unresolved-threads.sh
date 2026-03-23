#!/bin/bash
set -euo pipefail
# 未resolvedスレッド取得（GraphQL、ページング対応）
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
OWNER="${REPO%%/*}"
REPONAME="${REPO##*/}"

QUERY='query($owner:String!,$repo:String!,$pr:Int!,$after:String){repository(owner:$owner,name:$repo){pullRequest(number:$pr){reviewThreads(first:100,after:$after){pageInfo{hasNextPage,endCursor}nodes{id,isResolved,comments(first:1){nodes{body,author{login},path,line}}}}}}}'
AFTER="null"
HAS_NEXT="true"
ALL_NODES='[]'

while [ "$HAS_NEXT" = "true" ]; do
  RESPONSE=$(gh api graphql \
    -f query="$QUERY" \
    -F owner="$OWNER" -F repo="$REPONAME" -F pr="$PR_NUM" \
    -F after="$AFTER")
  PAGE_NODES=$(printf '%s\n' "$RESPONSE" | jq '.data.repository.pullRequest.reviewThreads.nodes')
  ALL_NODES=$(jq -s '.[0] + .[1]' <(printf '%s\n' "$ALL_NODES") <(printf '%s\n' "$PAGE_NODES"))
  HAS_NEXT=$(printf '%s\n' "$RESPONSE" | jq -r '.data.repository.pullRequest.reviewThreads.pageInfo.hasNextPage')
  AFTER=$(printf '%s\n' "$RESPONSE" | jq -r '.data.repository.pullRequest.reviewThreads.pageInfo.endCursor')
done

printf '{"data":{"repository":{"pullRequest":{"reviewThreads":{"nodes":%s}}}}}\n' "$ALL_NODES"
