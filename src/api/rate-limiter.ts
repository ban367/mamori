import * as vscode from "vscode";
import type { RateLimitInfo } from "../types";

/**
 * GitHub APIのレート制限管理
 */
export class RateLimiter {
  private rateLimitInfo: RateLimitInfo | undefined;
  private warningShown = false;

  /** レスポンスヘッダからレート制限情報を更新する */
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

      // 残り10%以下で警告
      if (this.rateLimitInfo.remaining < this.rateLimitInfo.limit * 0.1 && !this.warningShown) {
        this.warningShown = true;
        const resetDate = new Date(this.rateLimitInfo.reset * 1000);
        vscode.window.showWarningMessage(
          `Mamori: GitHub APIレート制限が残りわずかです（${this.rateLimitInfo.remaining}/${this.rateLimitInfo.limit}）。リセット: ${resetDate.toLocaleTimeString()}`,
        );
      }

      // リセット後に警告フラグをクリア
      if (this.rateLimitInfo.remaining > this.rateLimitInfo.limit * 0.1) {
        this.warningShown = false;
      }
    }
  }

  /** APIリクエストが可能かどうか */
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

  /** 現在のレート制限情報を取得する */
  getRateLimitInfo(): RateLimitInfo | undefined {
    return this.rateLimitInfo;
  }
}
