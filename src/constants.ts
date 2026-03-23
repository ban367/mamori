/** GitHub API のベースURL */
export const GITHUB_API_BASE = "https://api.github.com";

/** uses: 行を抽出する正規表現（グローバルフラグ付き） */
export const USES_LINE_PATTERN = /^(\s*-?\s*uses:\s*)(['"]?)([^'"#\s]+)\2/gm;

/** アクション参照をパースする正規表現 */
export const ACTION_REF_PATTERN = /^([^/]+)\/([^/@]+)(?:\/([^@]+))?@(.+)$/;

/** ローカルパス参照の判定パターン */
export const LOCAL_PATH_PATTERN = /^\.\//;

/** Docker参照の判定パターン */
export const DOCKER_PATTERN = /^docker:\/\//;

/** コミットSHAの判定パターン（40文字または短縮形7文字以上の16進数） */
export const COMMIT_SHA_PATTERN = /^[0-9a-f]{7,40}$/i;

/** semverタグの判定パターン（v付きも対応） */
export const SEMVER_TAG_PATTERN = /^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:-(.+))?$/;

/** メジャーバージョンタグの判定パターン（v1, v2 等） */
export const MAJOR_TAG_PATTERN = /^v?\d+$/;

/** デフォルトのキャッシュTTL（ミリ秒） */
export const DEFAULT_CACHE_TTL_MS = 60 * 60 * 1000;

/** デバウンス待機時間（ミリ秒） */
export const DEBOUNCE_DELAY_MS = 500;

/** GitHub APIのページサイズ */
export const API_PAGE_SIZE = 100;

/** 対象ファイルのglobパターン */
export const TARGET_FILE_GLOBS = [
  "**/.github/workflows/*.yml",
  "**/.github/workflows/*.yaml",
  "**/action.yml",
  "**/action.yaml",
];
