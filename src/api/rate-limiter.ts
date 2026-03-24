import * as vscode from "vscode";
import type { RateLimitInfo } from "../types";

/**
 * GitHub API rate limit manager.
 */
export class RateLimiter {
  private rateLimitInfo: RateLimitInfo | undefined;
  private warningShown = false;

  /** Update rate limit info from response headers */
  updateFromHeaders(headers: Headers): void {
    const limit = headers.get("x-ratelimit-limit");
    const remaining = headers.get("x-ratelimit-remaining");
    const reset = headers.get("x-ratelimit-reset");

    if (limit && remaining && reset) {
      this.rateLimitInfo = {
        limit: parseInt(limit, 10),
        remaining: parseInt(remaining, 10),
        reset: parseInt(reset, 10),
      };

      // Warn when less than 10% remaining
      if (this.rateLimitInfo.remaining < this.rateLimitInfo.limit * 0.1 && !this.warningShown) {
        this.warningShown = true;
        const resetDate = new Date(this.rateLimitInfo.reset * 1000);
        vscode.window.showWarningMessage(
          `Mamori: GitHub API rate limit is running low (${this.rateLimitInfo.remaining}/${this.rateLimitInfo.limit}). Resets at ${resetDate.toLocaleTimeString()}`,
        );
      }

      // Clear warning flag after reset
      if (this.rateLimitInfo.remaining > this.rateLimitInfo.limit * 0.1) {
        this.warningShown = false;
      }
    }
  }

  /** Check if API requests can be made */
  canMakeRequest(): boolean {
    if (!this.rateLimitInfo) {
      return true;
    }
    if (this.rateLimitInfo.remaining <= 0) {
      const now = Math.floor(Date.now() / 1000);
      return now >= this.rateLimitInfo.reset;
    }
    return true;
  }

  /** Get current rate limit info */
  getRateLimitInfo(): RateLimitInfo | undefined {
    return this.rateLimitInfo;
  }
}
