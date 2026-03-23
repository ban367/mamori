import { GITHUB_API_BASE, API_PAGE_SIZE } from "../constants";
import type { GitHubTag, GitHubRelease } from "../types";
import type { AuthManager } from "../auth/auth-manager";
import { RateLimiter } from "./rate-limiter";

/**
 * GitHub REST APIクライアント
 */
export class GitHubClient {
  private readonly rateLimiter = new RateLimiter();

  constructor(private readonly authManager: AuthManager) {}

  /** リポジトリのタグ一覧を取得する（ページネーション対応） */
  async getTags(owner: string, repo: string): Promise<GitHubTag[]> {
    const allTags: GitHubTag[] = [];
    let page = 1;
    const maxPages = 3; // 最大300タグまで取得

    while (page <= maxPages) {
      const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/tags?per_page=${API_PAGE_SIZE}&page=${page}`;
      const data = await this.request<GitHubTag[]>(url);

      if (!data || data.length === 0) {
        break;
      }

      allTags.push(...data);

      if (data.length < API_PAGE_SIZE) {
        break;
      }

      page++;
    }

    return allTags;
  }

  /** リポジトリのリリース一覧を取得する */
  async getReleases(owner: string, repo: string): Promise<GitHubRelease[]> {
    const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/releases?per_page=${API_PAGE_SIZE}`;
    const data = await this.request<GitHubRelease[]>(url);
    return data ?? [];
  }

  /** 特定のコミットSHAに一致するタグを検索する */
  async findTagBySha(
    owner: string,
    repo: string,
    sha: string,
    tags?: GitHubTag[],
  ): Promise<GitHubTag | undefined> {
    const tagList = tags ?? (await this.getTags(owner, repo));
    return tagList.find((tag) => tag.commit.sha === sha || tag.commit.sha.startsWith(sha));
  }

  /** APIリクエストを実行する */
  private async request<T>(url: string): Promise<T | undefined> {
    if (!this.rateLimiter.canMakeRequest()) {
      return undefined;
    }

    const token = await this.authManager.getToken();
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": "mamori-vscode-extension",
      "X-GitHub-Api-Version": "2022-11-28",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      console.log(`[Mamori] API リクエスト: ${url} (認証: ${token ? "あり" : "なし"})`);
      const response = await fetch(url, { headers });

      this.rateLimiter.updateFromHeaders(response.headers);

      if (!response.ok) {
        console.log(`[Mamori] API エラー: ${response.status} ${response.statusText} (${url})`);
        if (response.status === 404) {
          return undefined;
        }
        throw new Error(`GitHub API エラー: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as T;
      console.log(`[Mamori] API 成功: ${url} (${Array.isArray(data) ? data.length + "件" : "object"})`);
      return data;
    } catch (error) {
      console.log(`[Mamori] API 例外: ${error instanceof Error ? error.message : String(error)}`);
      if (error instanceof TypeError && error.message.includes("fetch")) {
        // ネットワークエラー（オフライン等）
        return undefined;
      }
      throw error;
    }
  }

  /** レート制限情報を取得する */
  getRateLimiter(): RateLimiter {
    return this.rateLimiter;
  }
}
