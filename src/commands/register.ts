import * as vscode from "vscode";
import type { ActionResolver } from "../resolvers/action-resolver";
import type { CacheManager } from "../cache/cache-manager";
import type { AuthManager } from "../auth/auth-manager";
import { changeVersion } from "./change-version";
import { toggleHash } from "./toggle-hash";
import { refresh, clearCache } from "./refresh";

/**
 * 全コマンドを登録する
 */
export function registerCommands(
  context: vscode.ExtensionContext,
  resolver: ActionResolver,
  cacheManager: CacheManager,
  authManager: AuthManager,
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("mamori.changeVersion", (args?: { line: number }) =>
      changeVersion(resolver, args),
    ),

    vscode.commands.registerCommand("mamori.toggleHash", (args?: { line: number }) =>
      toggleHash(resolver, args),
    ),

    vscode.commands.registerCommand("mamori.refresh", () => refresh(cacheManager)),

    vscode.commands.registerCommand("mamori.clearCache", () => clearCache(cacheManager)),

    vscode.commands.registerCommand("mamori.setToken", async () => {
      const token = await vscode.window.showInputBox({
        title: "Mamori: GitHub トークンを設定",
        prompt: "GitHub Personal Access Token を入力してください",
        password: true,
        placeHolder: "ghp_xxxxxxxxxxxxxxxxxxxx",
      });

      if (token === undefined) {
        return; // キャンセル
      }

      if (token === "") {
        await authManager.deleteToken();
        vscode.window.showInformationMessage("Mamori: GitHub トークンを削除しました");
      } else {
        await authManager.setToken(token);
        vscode.window.showInformationMessage("Mamori: GitHub トークンを設定しました");
      }
    }),
  );
}
