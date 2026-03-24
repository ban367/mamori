import {
  ACTION_REF_PATTERN,
  COMMIT_SHA_PATTERN,
  DOCKER_PATTERN,
  LOCAL_PATH_PATTERN,
  MAJOR_TAG_PATTERN,
  SEMVER_TAG_PATTERN,
} from "../constants";
import type { RefType } from "../types";

/** Parsed action reference (without position information) */
export interface ParsedActionRef {
  owner: string;
  repo: string;
  subPath?: string;
  ref: string;
  refType: RefType;
}

/**
 * Parse a `uses:` field value string.
 * Returns null for local paths (`./...`) and Docker references (`docker://...`).
 */
export function parseActionReference(raw: string): ParsedActionRef | null {
  if (LOCAL_PATH_PATTERN.test(raw) || DOCKER_PATTERN.test(raw)) {
    return null;
  }

  const match = raw.match(ACTION_REF_PATTERN);
  if (!match) {
    return null;
  }

  const [, owner, repo, subPath, ref] = match;
  const refType = detectRefType(ref);

  return {
    owner,
    repo,
    subPath: subPath || undefined,
    ref,
    refType,
  };
}

/** Detect the reference type from a ref string */
export function detectRefType(ref: string): RefType {
  if (COMMIT_SHA_PATTERN.test(ref)) {
    return "commit-sha";
  }
  if (SEMVER_TAG_PATTERN.test(ref) || MAJOR_TAG_PATTERN.test(ref)) {
    return "tag";
  }
  return "unknown";
}

/** Check if a tag is a major version tag (e.g. "v4", "4") */
export function isMajorVersionTag(tag: string): boolean {
  return MAJOR_TAG_PATTERN.test(tag);
}

/** Extract version numbers from a semver tag */
export function parseSemverTag(
  tag: string,
): { major: number; minor: number; patch: number; prerelease?: string } | null {
  const match = tag.match(SEMVER_TAG_PATTERN);
  if (!match) {
    return null;
  }
  return {
    major: parseInt(match[1], 10),
    minor: match[2] !== undefined ? parseInt(match[2], 10) : 0,
    patch: match[3] !== undefined ? parseInt(match[3], 10) : 0,
    prerelease: match[4] || undefined,
  };
}
