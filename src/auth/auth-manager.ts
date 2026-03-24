import * as vscode from "vscode";
import { execFile } from "child_process";

const SECRET_KEY = "mamori.githubToken";

/**
 * GitHub authentication token manager.
 * Priority: SecretStorage PAT -> gh auth token -> GITHUB_TOKEN env var -> unauthenticated
 */
export class AuthManager {
  private readonly secretStorage: vscode.SecretStorage;
  private ghCliTokenCache: string | undefined | null = null;

  constructor(context: vscode.ExtensionContext) {
    this.secretStorage = context.secrets;
  }

  /** Get authentication token (following priority order) */
  async getToken(): Promise<string | undefined> {
    // 1. PAT stored in SecretStorage
    const storedToken = await this.secretStorage.get(SECRET_KEY);
    if (storedToken) {
      return storedToken;
    }

    // 2. GitHub CLI token (async, cached for session)
    const ghToken = await this.getGhCliToken();
    if (ghToken) {
      return ghToken;
    }

    // 3. Environment variable
    const envToken = process.env.GITHUB_TOKEN;
    if (envToken) {
      return envToken;
    }

    // 4. Unauthenticated
    return undefined;
  }

  /** Store token in SecretStorage */
  async setToken(token: string): Promise<void> {
    await this.secretStorage.store(SECRET_KEY, token);
  }

  /** Delete token from SecretStorage */
  async deleteToken(): Promise<void> {
    await this.secretStorage.delete(SECRET_KEY);
  }

  /** Check if a token is available */
  async hasToken(): Promise<boolean> {
    const token = await this.getToken();
    return token !== undefined;
  }

  /** Get token from GitHub CLI (async, cached for session) */
  private async getGhCliToken(): Promise<string | undefined> {
    if (this.ghCliTokenCache !== null) {
      return this.ghCliTokenCache;
    }

    try {
      const token = await new Promise<string>((resolve, reject) => {
        execFile("gh", ["auth", "token"], { timeout: 5000 }, (error, stdout) => {
          if (error) {
            reject(error);
          } else {
            resolve(stdout.trim());
          }
        });
      });
      this.ghCliTokenCache = token || undefined;
    } catch {
      this.ghCliTokenCache = undefined;
    }

    return this.ghCliTokenCache;
  }
}
