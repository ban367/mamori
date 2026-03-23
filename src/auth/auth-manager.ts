import * as vscode from "vscode";
import { execSync } from "child_process";

const SECRET_KEY = "mamori.githubToken";

/**
 * GitHub認証トークンの管理
 * 優先順位: SecretStorage PAT → gh auth token → GITHUB_TOKEN環境変数 → 認証なし
 */
export class AuthManager {
  private readonly secretStorage: vscode.SecretStorage;

  constructor(context: vscode.ExtensionContext) {
    this.secretStorage = context.secrets;
  }

  /** トークンを取得する（優先順位に従う） */
  async getToken(): Promise<string | undefined> {
    // 1. SecretStorageに保存されたPAT
    const storedToken = await this.secretStorage.get(SECRET_KEY);
    if (storedToken) {
      return storedToken;
    }

    // 2. GitHub CLIのトークン
    const ghToken = this.getGhCliToken();
    if (ghToken) {
      return ghToken;
    }

    // 3. 環境変数
    const envToken = process.env.GITHUB_TOKEN;
    if (envToken) {
      return envToken;
    }

    // 4. 認証なし
    return undefined;
  }

  /** SecretStorageにトークンを保存する */
  async setToken(token: string): Promise<void> {
    await this.secretStorage.store(SECRET_KEY, token);
  }

  /** SecretStorageからトークンを削除する */
  async deleteToken(): Promise<void> {
    await this.secretStorage.delete(SECRET_KEY);
  }

  /** トークンが設定されているかどうか */
  async hasToken(): Promise<boolean> {
    const token = await this.getToken();
    return token !== undefined;
  }

  /** GitHub CLIからトークンを取得する */
  private getGhCliToken(): string | undefined {
    try {
      const token = execSync("gh auth token", {
        encoding: "utf-8",
        timeout: 5000,
        stdio: ["pipe", "pipe", "pipe"],
      }).trim();
      return token || undefined;
    } catch {
      return undefined;
    }
  }
}
