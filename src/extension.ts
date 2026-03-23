import * as vscode from "vscode";
import { DEBOUNCE_DELAY_MS } from "./constants";
import { isTargetDocument, parseDocument } from "./parsers/yaml-parser";
import { AuthManager } from "./auth/auth-manager";
import { GitHubClient } from "./api/github-client";
import { CacheManager } from "./cache/cache-manager";
import { ActionResolver } from "./resolvers/action-resolver";
import { Decorator } from "./ui/decorator";
import { ActionHoverProvider } from "./ui/hover-provider";
import { ActionCodeLensProvider } from "./ui/codelens-provider";
import { VersionClickHandler } from "./ui/document-link-provider";
import { registerCommands } from "./commands/register";

let decorator: Decorator;
let resolver: ActionResolver;
let codeLensProvider: ActionCodeLensProvider;
let debounceTimer: ReturnType<typeof setTimeout> | undefined;
let outputChannel: vscode.OutputChannel;

function log(message: string): void {
  outputChannel?.appendLine(`[${new Date().toISOString()}] ${message}`);
}

export function activate(context: vscode.ExtensionContext): void {
  outputChannel = vscode.window.createOutputChannel("Mamori");
  context.subscriptions.push(outputChannel);
  log("Mamori 拡張機能を起動中...");

  const authManager = new AuthManager(context);
  const githubClient = new GitHubClient(authManager);
  const cacheManager = new CacheManager(context);
  resolver = new ActionResolver(githubClient, cacheManager);
  decorator = new Decorator();

  // ホバープロバイダーの登録
  const hoverProvider = new ActionHoverProvider(resolver);
  context.subscriptions.push(
    vscode.languages.registerHoverProvider(
      { language: "yaml", scheme: "file" },
      hoverProvider,
    ),
  );

  // CodeLensプロバイダーの登録（オプション）
  codeLensProvider = new ActionCodeLensProvider(resolver);
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      { language: "yaml", scheme: "file" },
      codeLensProvider,
    ),
  );

  // バージョン部分ダブルクリックでQuickPickを開くハンドラー
  const versionClickHandler = new VersionClickHandler(resolver);
  context.subscriptions.push(versionClickHandler);

  // コマンドの登録
  registerCommands(context, resolver, cacheManager, authManager);

  // アクティブエディタの変更監視
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor && isTargetDocument(editor.document)) {
        updateDecorations(editor);
      }
    }),
  );

  // ドキュメント変更の監視（デバウンス付き）
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document !== event.document) {
        return;
      }
      if (!isTargetDocument(event.document)) {
        return;
      }
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = setTimeout(() => {
        updateDecorations(editor);
      }, DEBOUNCE_DELAY_MS);
    }),
  );

  // 初期表示
  const activeEditor = vscode.window.activeTextEditor;
  if (activeEditor && isTargetDocument(activeEditor.document)) {
    log(`初期表示: ${activeEditor.document.uri.fsPath}`);
    updateDecorations(activeEditor);
  } else {
    log(`初期表示スキップ: アクティブエディタなし、または対象外ファイル`);
  }

  log("Mamori 拡張機能の起動完了");
}

async function updateDecorations(editor: vscode.TextEditor): Promise<void> {
  try {
    const references = parseDocument(editor.document);
    log(`パース結果: ${references.length}件のアクション参照を検出 (${editor.document.uri.fsPath})`);

    if (references.length === 0) {
      decorator.clearDecorations(editor);
      return;
    }

    for (const ref of references) {
      log(`  - ${ref.raw} (${ref.refType}) 行:${ref.range.start.line + 1}`);
    }

    const resolvedActions = await resolver.resolveAll(references);

    for (const action of resolvedActions) {
      log(`  解決: ${action.reference.raw} → ${action.status}${action.latestVersion ? ` (最新: ${action.latestVersion})` : ""}${action.errorMessage ? ` エラー: ${action.errorMessage}` : ""}`);
    }

    decorator.applyDecorations(editor, resolvedActions);
    codeLensProvider?.refresh();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`エラー: ${message}`);
    console.error("[Mamori]", error);
  }
}

export function deactivate(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  decorator?.dispose();
  codeLensProvider?.dispose();
}
