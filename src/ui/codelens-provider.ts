import * as vscode from "vscode";
import type { ActionResolver } from "../resolvers/action-resolver";
import { isTargetDocument, parseDocument } from "../parsers/yaml-parser";

/**
 * uses: 行の上にバージョン変更リンクを表示するCodeLensプロバイダー（オプション機能）
 */
export class ActionCodeLensProvider implements vscode.CodeLensProvider {
  private _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
  readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

  constructor(private readonly resolver: ActionResolver) {}

  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    if (!isTargetDocument(document)) {
      return [];
    }

    const config = vscode.workspace.getConfiguration("mamori");
    if (!config.get<boolean>("enableCodeLens", false)) {
      return [];
    }

    const references = parseDocument(document);
    return references.map((ref) => {
      const resolved = this.resolver.getResolved(ref);
      const title = resolved
        ? this.buildTitle(resolved)
        : `$(loading~spin) ${ref.owner}/${ref.repo}`;

      return new vscode.CodeLens(ref.range, {
        title,
        command: "mamori.changeVersion",
        arguments: [{ line: ref.range.start.line }],
      });
    });
  }

  /** CodeLensの再描画をトリガーする */
  refresh(): void {
    this._onDidChangeCodeLenses.fire();
  }

  dispose(): void {
    this._onDidChangeCodeLenses.dispose();
  }

  private buildTitle(
    resolved: import("../types").ResolvedAction,
  ): string {
    const { status, reference, latestVersion, currentTag } = resolved;

    switch (status) {
      case "latest":
        return `$(check) ${reference.ref} は最新`;
      case "updatable":
        return `$(arrow-up) ${latestVersion} にアップデート可能`;
      case "deprecated":
        return `$(warning) ${reference.ref} は非推奨`;
      case "unresolved":
        return `$(question) バージョン情報なし`;
    }
  }
}
