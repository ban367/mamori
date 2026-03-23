---
name: fix-pr
description: PRのレビューコメントを確認し、対応プランを構築・実装・返信・コミット・resolveする
---

## コンテキスト取得

まず以下のコマンドをBashツールで実行し、コンテキストを収集する（並列実行可能なものは並列で実行する）:

1. **PR概要**: `gh pr view --json number,title,url,headRefName,baseRefName,state`
2. **インラインレビューコメント**: `bash .claude/skills/fix-pull-request/scripts/get-inline-comments.sh`
3. **一般コメント**: `bash .claude/skills/fix-pull-request/scripts/get-general-comments.sh`
4. **レビューサマリー**: `gh pr view --json reviews`
5. **未resolvedスレッド一覧** (threadId含む): `bash .claude/skills/fix-pull-request/scripts/get-unresolved-threads.sh`

## 前提チェック

コンテキスト取得後、まず以下を確認する:

- 未resolvedのスレッドまたは未対応のコメントが存在するか
- 存在しない場合は「対応が必要なレビューコメントはありません。」と報告して終了する

## 手順

### ステップ1: レビュー分析

上記コンテキストを読み込み、以下を整理する:

- 未resolved（`isResolved: false`）のスレッドを全件リストアップ
- インラインコメント（ファイル・行情報付き）と一般コメントを区別する
- 各コメントに含まれる指摘内容・要望・質問を把握する
- レビューの種類を確認し、優先度を判断する:
  - **CHANGES_REQUESTED**: マージをブロック中。最優先で対応する
  - **COMMENTED**: 通常の指摘。内容に応じて対応する
  - **APPROVED**: 改善提案の可能性が高い。対応推奨だが必須ではない
- GitHub Suggestion（` ```suggestion ` ブロック）を含むコメントを検知する
  - Suggestionは「レビュアーが具体的なコード変更を提案している」もの。そのまま適用できるため対応が容易
- outdated（古いdiffに対する）コメントを区別する
  - outdatedコメントは、ファイルが変更されてdiffの行番号がずれた場合に発生する。現在のコードで既に解消されている可能性がある
- 必要であれば `gh pr diff` でdiffを取得して変更箇所を確認する

### ステップ2: 対応プランの構築

コメントごとに対応方針を表形式で提示する:

| # | コメント要約 | 種別 | 対応方針 | 優先度 |
|---|------------|------|---------|-------|
| 1 | (コメントの要約) | 修正 / Suggestion適用 / 返答 / 不要 | (具体的な対応内容) | 高 / 中 / 低 |

対応方針の分類:
- **コード修正が必要なもの** → 修正内容を具体的に示す
- **GitHub Suggestion** → そのまま適用するか、修正して適用するかを判断する
- **質問・確認事項** → 返答内容を草案する
- **対応不要・意図的なもの** → その理由を説明する
- **outdatedコメント** → 現在のコードで既に解消されていれば、その旨を返信する

**ユーザー確認が必要なケース:**

以下のいずれかに該当する場合は、コード修正を開始する前にユーザーに確認する:

- 設計方針やアーキテクチャに関わる変更を求められている
- レビュアーの指摘内容が曖昧で、複数の解釈が可能
- 対応するとスコープが大きく広がる（他ファイルへの波及が3ファイル以上）
- レビュアーの指摘に同意できない点がある

それ以外（明確なバグ指摘、typo修正、コードスタイルの改善など）はそのまま進めてよい。

### ステップ3: コード修正

AGENTS.mdおよび `.github/instructions/general.instructions.md` の規約に従い実装する:

- 最小限の変更にとどめる（レビューコメントへの対応のみ）
- 1関数1機能・スコープを狭く保つ
- セキュリティ・エラーハンドリングの規約を遵守する
- GitHub Suggestionの適用: suggestionブロックの内容を該当ファイルの該当行に反映する

### ステップ4: コメント返信

各コメントに日本語で返信する。

**インラインコメントへの返信:**
```bash
REPLY_FILE=$(mktemp)
cat > "$REPLY_FILE" << 'JSONEOF'
{"body": "<返信内容（日本語）>"}
JSONEOF
PR_NUM=$(gh pr view --json number --jq '.number')
REPO=$(gh repo view --json nameWithOwner --jq '.nameWithOwner')
gh api repos/$REPO/pulls/$PR_NUM/comments/<comment_id>/replies \
  -X POST --input "$REPLY_FILE"
rm -f "$REPLY_FILE"
```

**一般コメントへの返信:**
```bash
REPLY_FILE=$(mktemp)
cat > "$REPLY_FILE" << 'JSONEOF'
{"body": "<返信内容（日本語）>"}
JSONEOF
PR_NUM=$(gh pr view --json number --jq '.number')
REPO=$(gh repo view --json nameWithOwner --jq '.nameWithOwner')
gh api repos/$REPO/issues/$PR_NUM/comments \
  -X POST --input "$REPLY_FILE"
rm -f "$REPLY_FILE"
```

返信内容の例:
- 修正対応: 「ご指摘のとおり修正しました。`<修正内容の概要>` に変更しています。」
- Suggestion適用: 「Suggestionを適用しました。ありがとうございます。」
- 質問への回答: 「`<質問内容>` についてですが、`<回答>` のため現状の実装としています。」
- 意図的な実装: 「`<理由>` のため意図的にこの実装としています。問題があればご指摘ください。」
- outdated対応: 「こちらは最新のコードでは既に解消されています。（該当コミット: `<hash>`）」

### ステップ5: コミット

英語・Conventional Commits形式でコミットする（AGENTS.mdの規約に従う）。

**コミット分割の方針:**

関連性のある変更は1つのコミットにまとめ、性質の異なる変更は分割する:

- バグ修正とリファクタリングが混在 → 別コミット
- 同じ機能に対する複数の指摘 → 1コミット
- ドキュメント修正とコード修正 → 別コミット

判断に迷ったら1コミットにまとめてよい（分割しすぎるよりシンプルな方がよい）。

```bash
git add <変更ファイル>
git commit -m "$(cat <<'EOF'
fix: address review comments

- <対応内容1の英語要約>
- <対応内容2の英語要約>

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

使用するプレフィックス例:
- `fix:` バグ修正・レビュー指摘への修正
- `refactor:` リファクタリング
- `docs:` ドキュメント修正
- `style:` コードスタイル修正
- `test:` テスト追加・修正

### ステップ6: スレッドresolve

対応済みスレッドを `resolveReviewThread` GraphQL mutationでresolveする。

threadIdはコンテキストで取得済みの `id`（`PRRT_...` 形式）を使用する:

```bash
JFILE=$(mktemp)
cat > "$JFILE" << 'ENDJSON'
{"query": "mutation($threadId:ID!){resolveReviewThread(input:{threadId:$threadId}){thread{id,isResolved}}}"}
ENDJSON
jq --arg tid "<PRRT_...>" '. + {variables: {threadId: $tid}}' "$JFILE" | gh api graphql --input -
rm -f "$JFILE"
```

対応不要と判断したスレッドも理由を返信したうえでresolveする。

### 完了報告

すべてのステップが完了したら、以下を日本語でまとめて報告する:

- 対応したレビューコメントの一覧と対応内容
- コミットハッシュ（複数コミットの場合はすべて）
- resolveしたスレッド数
- 対応しなかったコメントがある場合はその理由
