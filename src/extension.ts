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
  log("Activating Mamori extension...");

  const authManager = new AuthManager(context);
  const githubClient = new GitHubClient(authManager);
  const cacheManager = new CacheManager(context);
  resolver = new ActionResolver(githubClient, cacheManager);
  decorator = new Decorator();

  // Register hover provider
  const hoverProvider = new ActionHoverProvider(resolver);
  context.subscriptions.push(
    vscode.languages.registerHoverProvider(
      { language: "yaml", scheme: "file" },
      hoverProvider,
    ),
  );

  // Register CodeLens provider (optional)
  codeLensProvider = new ActionCodeLensProvider(resolver);
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      { language: "yaml", scheme: "file" },
      codeLensProvider,
    ),
  );

  // Register version click handler (double-click to open QuickPick)
  const versionClickHandler = new VersionClickHandler(resolver);
  context.subscriptions.push(versionClickHandler);

  // Register commands
  registerCommands(context, resolver, cacheManager, authManager);

  // Watch for active editor changes
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor && isTargetDocument(editor.document)) {
        updateDecorations(editor);
      }
    }),
  );

  // Watch for document changes (with debounce)
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

  // Initial decoration
  const activeEditor = vscode.window.activeTextEditor;
  if (activeEditor && isTargetDocument(activeEditor.document)) {
    log(`Initial decoration: ${activeEditor.document.uri.fsPath}`);
    updateDecorations(activeEditor);
  } else {
    log("Skipped initial decoration: no active editor or not a target file");
  }

  log("Mamori extension activated");
}

async function updateDecorations(editor: vscode.TextEditor): Promise<void> {
  try {
    const references = parseDocument(editor.document);
    log(`Parsed ${references.length} action reference(s) in ${editor.document.uri.fsPath}`);

    if (references.length === 0) {
      decorator.clearDecorations(editor);
      return;
    }

    for (const ref of references) {
      log(`  - ${ref.raw} (${ref.refType}) line:${ref.range.start.line + 1}`);
    }

    const resolvedActions = await resolver.resolveAll(references);

    for (const action of resolvedActions) {
      log(`  Resolved: ${action.reference.raw} -> ${action.status}${action.latestVersion ? ` (latest: ${action.latestVersion})` : ""}${action.errorMessage ? ` error: ${action.errorMessage}` : ""}`);
    }

    decorator.applyDecorations(editor, resolvedActions);
    codeLensProvider?.refresh();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`Error: ${message}`);
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
