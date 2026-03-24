import * as vscode from "vscode";
import type { CacheManager } from "../cache/cache-manager";

/**
 * Manual refresh command.
 * Clears cache and re-fetches version info.
 */
export async function refresh(
  cacheManager: CacheManager,
  onRefreshed?: () => void,
): Promise<void> {
  cacheManager.clearAll();

  if (onRefreshed) {
    onRefreshed();
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
