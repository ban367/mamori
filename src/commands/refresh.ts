import * as vscode from "vscode";
import type { CacheManager } from "../cache/cache-manager";

/**
 * Manual refresh command.
 * Clears cache and re-fetches version info.
 */
export async function refresh(cacheManager: CacheManager): Promise<void> {
  cacheManager.clearAll();

  const editor = vscode.window.activeTextEditor;
  if (editor) {
    await vscode.commands.executeCommand("editor.action.forceRetokenize");
  }

  vscode.window.showInformationMessage("Mamori: Version info refreshed");
}

/**
 * Clear cache command.
 */
export async function clearCache(cacheManager: CacheManager): Promise<void> {
  const count = cacheManager.size;
  cacheManager.clearAll();
  vscode.window.showInformationMessage(
    `Mamori: Cache cleared (${count} entries)`,
  );
}
