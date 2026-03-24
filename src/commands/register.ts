import * as vscode from "vscode";
import type { ActionResolver } from "../resolvers/action-resolver";
import type { CacheManager } from "../cache/cache-manager";
import type { AuthManager } from "../auth/auth-manager";
import { changeVersion } from "./change-version";
import { toggleHash } from "./toggle-hash";
import { refresh, clearCache } from "./refresh";

/**
 * Register all commands.
 */
export function registerCommands(
  context: vscode.ExtensionContext,
  resolver: ActionResolver,
  cacheManager: CacheManager,
  authManager: AuthManager,
  onRefreshed?: () => void,
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("mamori.changeVersion", (args?: { line: number }) =>
      changeVersion(resolver, args),
    ),

    vscode.commands.registerCommand("mamori.toggleHash", (args?: { line: number }) =>
      toggleHash(resolver, args),
    ),

    vscode.commands.registerCommand("mamori.refresh", () => refresh(cacheManager, onRefreshed)),

    vscode.commands.registerCommand("mamori.clearCache", () => clearCache(cacheManager)),

    vscode.commands.registerCommand("mamori.setToken", async () => {
      const token = await vscode.window.showInputBox({
        title: "Mamori: Set GitHub Token",
        prompt: "Enter your GitHub Personal Access Token",
        password: true,
        placeHolder: "ghp_xxxxxxxxxxxxxxxxxxxx",
      });

      if (token === undefined) {
        return;
      }

      if (token === "") {
        await authManager.deleteToken();
        vscode.window.showInformationMessage("Mamori: GitHub token removed");
      } else {
        await authManager.setToken(token);
        vscode.window.showInformationMessage("Mamori: GitHub token saved");
      }
    }),
  );
}
