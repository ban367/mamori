import * as vscode from "vscode";
import type { ActionResolver } from "../resolvers/action-resolver";
import type { ActionReference, ResolvedAction } from "../types";
import { parseDocument } from "../parsers/yaml-parser";

/**
 * uses: 行にホバーした際にバージョン詳細とコマンドリンクを表示する
 */
export class ActionHoverProvider implements vscode.HoverProvider {
  constructor(private readonly resolver: ActionResolver) {}

  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.Hover | undefined {
    // ドキュメント内のuses行を解析
    const references = parseDocument(document);

    // ホバー位置に対応するActionReferenceを検索
    const reference = references.find((ref) => ref.range.contains(position));
    if (!reference) {
      return undefined;
    }

    // 解決結果を取得
    const resolved = this.resolver.getResolved(reference);
    if (!resolved) {
      return undefined;
    }

    const markdown = this.buildHoverContent(resolved);
    return new vscode.Hover(markdown, reference.range);
  }

  private buildHoverContent(resolved: ResolvedAction): vscode.MarkdownString {
    const { reference, status, currentTag, currentSha, latestVersion, latestSha, availableTags } =
      resolved;

    const md = new vscode.MarkdownString();
    md.isTrusted = true;
    md.supportThemeIcons = true;

    // ヘッダー
    const repoPath = reference.subPath
      ? `${reference.owner}/${reference.repo}/${reference.subPath}`
      : `${reference.owner}/${reference.repo}`;
    md.appendMarkdown(`**${repoPath}** @ \`${reference.ref}\`\n\n`);

    // ステータス表示
    switch (status) {
      case "latest":
        md.appendMarkdown(`$(check) **最新バージョン**\n\n`);
        break;
      case "updatable":
        md.appendMarkdown(`$(arrow-up) **アップデート可能**\n\n`);
        break;
      case "deprecated":
        md.appendMarkdown(`$(warning) **非推奨**\n\n`);
        break;
      case "unresolved":
        md.appendMarkdown(`$(question) **バージョン情報を取得できません**\n\n`);
        if (resolved.errorMessage) {
          md.appendMarkdown(`${resolved.errorMessage}\n\n`);
        }
        return md;
    }

    // 詳細情報テーブル
    md.appendMarkdown(`| 項目 | 値 |\n|------|------|\n`);

    if (reference.refType === "commit-sha" && currentTag) {
      md.appendMarkdown(`| 対応タグ | \`${currentTag}\` |\n`);
    }

    if (currentSha) {
      md.appendMarkdown(`| SHA | \`${currentSha.substring(0, 12)}\` |\n`);
    }

    if (latestVersion) {
      md.appendMarkdown(`| 最新バージョン | \`${latestVersion}\` |\n`);
    }

    if (latestSha) {
      md.appendMarkdown(`| 最新SHA | \`${latestSha.substring(0, 12)}\` |\n`);
    }

    md.appendMarkdown(`\n`);

    // コマンドリンク
    const refArg = encodeURIComponent(JSON.stringify({ line: reference.range.start.line }));
    md.appendMarkdown(
      `[$(versions) バージョンを変更](command:mamori.changeVersion?${refArg})`,
    );
    md.appendMarkdown(` | `);
    md.appendMarkdown(
      `[$(symbol-key) SHA⇔タグ変換](command:mamori.toggleHash?${refArg})`,
    );

    // 利用可能なタグ数
    if (availableTags && availableTags.length > 0) {
      md.appendMarkdown(`\n\n---\n`);
      md.appendMarkdown(`*${availableTags.length}個のバージョンが利用可能*`);
    }

    return md;
  }
}
