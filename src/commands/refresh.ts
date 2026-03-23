import * as vscode from "vscode";
import type { CacheManager } from "../cache/cache-manager";

/**
 * 手動リフレッシュコマンド
 * キャッシュを無視してバージョン情報を再取得する
 */
export async function refresh(cacheManager: CacheManager): Promise<void> {
  // 現在のファイルに関連するキャッシュをクリアし、再取得をトリガー
  cacheManager.clearAll();

  // アクティブエディタの再装飾をトリガーするため、一時的にテキスト変更イベントを発火
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    // テキスト変更イベントを発火させて再装飾をトリガー
    await vscode.commands.executeCommand("editor.action.forceRetokenize");
  }

  vscode.window.showInformationMessage("Mamori: バージョン情報を更新しました");
}

/**
 * キャッシュクリアコマンド
 */
export async function clearCache(cacheManager: CacheManager): Promise<void> {
  const count = cacheManager.size;
  cacheManager.clearAll();
  vscode.window.showInformationMessage(
    `Mamori: キャッシュをクリアしました（${count}件）`,
  );
}
