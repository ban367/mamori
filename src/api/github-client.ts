import { GITHUB_API_BASE, API_PAGE_SIZE } from "../constants";
import type { GitHubTag, GitHubRelease } from "../types";
import type { AuthManager } from "../auth/auth-manager";
import { RateLimiter } from "./rate-limiter";

/**
 * GitHub REST API client.
 */
export class GitHubClient {
  private readonly rateLimiter = new RateLimiter();

  constructor(private readonly authManager: AuthManager) {}

  /** Fetch repository tags (with pagination) */
  async getTags(owner: string, repo: string): Promise<GitHubTag[]> {
    const allTags: GitHubTag[] = [];
    let page = 1;
    const maxPages = 3;

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

  /** Fetch repository releases */
  async getReleases(owner: string, repo: string): Promise<GitHubRelease[]> {
    const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/releases?per_page=${API_PAGE_SIZE}`;
    const data = await this.request<GitHubRelease[]>(url);
    return data ?? [];
  }

  /** Find a tag matching a specific commit SHA */
  async findTagBySha(
    owner: string,
    repo: string,
    sha: string,
    tags?: GitHubTag[],
  ): Promise<GitHubTag | undefined> {
    const tagList = tags ?? (await this.getTags(owner, repo));
    return tagList.find((tag) => tag.commit.sha === sha || tag.commit.sha.startsWith(sha));
  }

  /** Execute an API request */
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
      const response = await fetch(url, { headers });

      this.rateLimiter.updateFromHeaders(response.headers);

      if (!response.ok) {
        if (response.status === 404) {
          return undefined;
        }
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes("fetch")) {
        return undefined;
      }
      throw error;
    }
  }

  /** Get rate limiter instance */
  getRateLimiter(): RateLimiter {
    return this.rateLimiter;
  }
}
