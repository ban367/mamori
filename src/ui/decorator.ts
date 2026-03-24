import * as vscode from "vscode";
import type { ResolvedAction, VersionStatus } from "../types";

/**
 * Manages TextEditorDecorationType for inline version status display.
 */
export class Decorator {
  private readonly decorationTypes: Record<VersionStatus, vscode.TextEditorDecorationType>;

  constructor() {
    this.decorationTypes = {
      latest: vscode.window.createTextEditorDecorationType({
        after: {
          color: new vscode.ThemeColor("mamori.latestVersion"),
          margin: "0 0 0 1.5em",
          fontStyle: "italic",
        },
        isWholeLine: false,
      }),
      updatable: vscode.window.createTextEditorDecorationType({
        after: {
          color: new vscode.ThemeColor("mamori.updatableVersion"),
          margin: "0 0 0 1.5em",
          fontStyle: "italic",
        },
        isWholeLine: false,
      }),
      deprecated: vscode.window.createTextEditorDecorationType({
        after: {
          color: new vscode.ThemeColor("mamori.deprecatedVersion"),
          margin: "0 0 0 1.5em",
          fontStyle: "italic",
        },
        isWholeLine: false,
      }),
      unresolved: vscode.window.createTextEditorDecorationType({
        after: {
          color: new vscode.ThemeColor("mamori.unresolvedVersion"),
          margin: "0 0 0 1.5em",
          fontStyle: "italic",
        },
        isWholeLine: false,
      }),
    };
  }

  /** Apply decorations to the editor */
  applyDecorations(editor: vscode.TextEditor, resolvedActions: ResolvedAction[]): void {
    const groups: Record<VersionStatus, vscode.DecorationOptions[]> = {
      latest: [],
      updatable: [],
      deprecated: [],
      unresolved: [],
    };

    for (const action of resolvedActions) {
      const text = this.buildDecorationText(action);
      const decoration: vscode.DecorationOptions = {
        range: action.reference.range,
        renderOptions: {
          after: {
            contentText: text,
          },
        },
      };
      groups[action.status].push(decoration);
    }

    for (const status of Object.keys(groups) as VersionStatus[]) {
      editor.setDecorations(this.decorationTypes[status], groups[status]);
    }
  }

  /** Clear all decorations */
  clearDecorations(editor: vscode.TextEditor): void {
    for (const decorationType of Object.values(this.decorationTypes)) {
      editor.setDecorations(decorationType, []);
    }
  }

  /** Dispose resources */
  dispose(): void {
    for (const decorationType of Object.values(this.decorationTypes)) {
      decorationType.dispose();
    }
  }

  /** Build decoration display text */
  private buildDecorationText(action: ResolvedAction): string {
    const { status, latestVersion } = action;

    switch (status) {
      case "latest":
        return "✓";
      case "updatable":
        return latestVersion ? `⬆ ${latestVersion}` : "⬆";
      case "deprecated":
        return latestVersion ? `⚠ ${latestVersion}` : "⚠";
      case "unresolved":
        return "?";
    }
  }
}
