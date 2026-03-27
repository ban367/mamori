/** GitHub API base URL */
export const GITHUB_API_BASE = "https://api.github.com";

/** Regex pattern to extract `uses:` lines (with global flag) */
export const USES_LINE_PATTERN = /^([ \t]*-?[ \t]*uses:[ \t]*)(['"]?)([^'"#\s]+)\2/gm;

/** Regex pattern to parse action references */
export const ACTION_REF_PATTERN = /^([^/]+)\/([^/@]+)(?:\/([^@]+))?@(.+)$/;

/** Pattern to detect local path references */
export const LOCAL_PATH_PATTERN = /^\.\//;

/** Pattern to detect Docker references */
export const DOCKER_PATTERN = /^docker:\/\//;

/** Pattern to detect commit SHA (40 chars or abbreviated 7+ hex chars) */
export const COMMIT_SHA_PATTERN = /^[0-9a-f]{7,40}$/i;

/** Pattern to detect semver tags (with or without "v" prefix) */
export const SEMVER_TAG_PATTERN = /^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:-(.+))?$/;

/** Pattern to detect major version tags (e.g. v1, v2) */
export const MAJOR_TAG_PATTERN = /^v?\d+$/;

/** Default cache TTL (milliseconds) */
export const DEFAULT_CACHE_TTL_MS = 60 * 60 * 1000;

/** Debounce delay (milliseconds) */
export const DEBOUNCE_DELAY_MS = 500;

/** GitHub API page size */
export const API_PAGE_SIZE = 100;

/** Glob patterns for target files */
export const TARGET_FILE_GLOBS = [
  "**/.github/workflows/*.yml",
  "**/.github/workflows/*.yaml",
  "**/action.yml",
  "**/action.yaml",
];
