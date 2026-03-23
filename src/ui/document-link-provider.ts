import * as vscode from "vscode";
import type { ActionResolver } from "../resolvers/action-resolver";
import { isTargetDocument, parseDocument } from "../parsers/yaml-parser";
import { changeVersionAtLine } from "../commands/change-version";

/**
 * uses: 行のバージョン部分（@以降）をクリックしたときにQuickPickを開く
 */
export class VersionClickHandler {
  private disposable: vscode.Disposable;

  constructor(private readonly resolver: ActionResolver) {
    this.disposable = vscode.window.onDidChangeTextEditorSelection((event) => {
      this.handleSelectionChange(event);
    });
  }

  private handleSelectionChange(event: vscode.TextEditorSelectionChangeEvent): void {
    // マウス操作のみ対象
    if (event.kind !== vscode.TextEditorSelectionChangeKind.Mouse) {
      return;
    }

    const editor = event.textEditor;
    if (!isTargetDocument(editor.document)) {
      return;
    }

    if (event.selections.length !== 1) {
      return;
    }

    const selection = event.selections[0];

    // ダブルクリック = 単語選択（selectionが空でない & 同一行内）
    if (selection.isEmpty || selection.start.line !== selection.end.line) {
      return;
    }

    const line = selection.start.line;
    const references = parseDocument(editor.document);
    const clickedRef = references.find((ref) => {
      if (ref.refRange.start.line !== line) {
        return false;
      }
      // 選択範囲がrefRange内に重なっているか
      const refStart = ref.refRange.start.character;
      const refEnd = ref.refRange.end.character;
      const selStart = selection.start.character;
      const selEnd = selection.end.character;
      return selStart < refEnd && selEnd > refStart;
    });

    if (!clickedRef) {
      return;
    }

    changeVersionAtLine(this.resolver, line);
  }

  dispose(): void {
    this.disposable.dispose();
  }
}
