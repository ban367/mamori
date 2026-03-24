import { MAJOR_TAG_PATTERN, SEMVER_TAG_PATTERN } from "../constants";
import type { GitHubTag, TagInfo } from "../types";

/**
 * Semver-based version comparison utilities.
 */

/** Convert GitHub tags to TagInfo, filter by semver, and sort descending */
export function sortAndFilterTags(githubTags: GitHubTag[]): TagInfo[] {
  const tagInfos: TagInfo[] = githubTags
    .filter((tag) => SEMVER_TAG_PATTERN.test(tag.name) || MAJOR_TAG_PATTERN.test(tag.name))
    .map((tag) => ({
      name: tag.name,
      sha: tag.commit.sha,
      isMajorTag: MAJOR_TAG_PATTERN.test(tag.name),
    }));

  return tagInfos.sort((a, b) => compareSemver(b.name, a.name));
}

/** Get the latest stable version tag (excluding prereleases) */
export function getLatestStableTag(tags: TagInfo[]): TagInfo | undefined {
  return tags.find((tag) => {
    if (tag.isMajorTag) {
      return false;
    }
    const match = tag.name.match(SEMVER_TAG_PATTERN);
    if (!match) {
      return false;
    }
    return !match[4];
  });
}

/** Get the latest stable tag within a specific major version */
export function getLatestTagInMajor(tags: TagInfo[], majorVersion: number): TagInfo | undefined {
  return tags.find((tag) => {
    if (tag.isMajorTag) {
      return false;
    }
    const match = tag.name.match(SEMVER_TAG_PATTERN);
    if (!match || match[4]) {
      return false;
    }
    return parseInt(match[1], 10) === majorVersion;
  });
}

/**
 * Compare two semver versions.
 * @returns positive if a > b, negative if a < b, 0 if equal
 */
export function compareSemver(a: string, b: string): number {
  const parsedA = parseSemverParts(a);
  const parsedB = parseSemverParts(b);

  if (!parsedA && !parsedB) return 0;
  if (!parsedA) return -1;
  if (!parsedB) return 1;

  if (parsedA.major !== parsedB.major) return parsedA.major - parsedB.major;
  if (parsedA.minor !== parsedB.minor) return parsedA.minor - parsedB.minor;
  if (parsedA.patch !== parsedB.patch) return parsedA.patch - parsedB.patch;

  // Stable (no prerelease) takes precedence over prerelease
  if (!parsedA.prerelease && parsedB.prerelease) return 1;
  if (parsedA.prerelease && !parsedB.prerelease) return -1;
  if (parsedA.prerelease && parsedB.prerelease) {
    return comparePrerelease(parsedA.prerelease, parsedB.prerelease);
  }

  return 0;
}

/**
 * Compare prerelease strings according to SemVer rules.
 * Split by `.` and compare numeric parts numerically.
 */
function comparePrerelease(a: string, b: string): number {
  const aIds = a.split(".");
  const bIds = b.split(".");
  const len = Math.max(aIds.length, bIds.length);

  for (let i = 0; i < len; i += 1) {
    const aId = aIds[i];
    const bId = bIds[i];

    if (aId === undefined && bId === undefined) return 0;
    if (aId === undefined) return -1;
    if (bId === undefined) return 1;

    const aNum = /^\d+$/.test(aId);
    const bNum = /^\d+$/.test(bId);

    if (aNum && bNum) {
      const diff = parseInt(aId, 10) - parseInt(bId, 10);
      if (diff !== 0) return diff;
    } else if (aNum && !bNum) {
      return -1;
    } else if (!aNum && bNum) {
      return 1;
    } else {
      const cmp = aId.localeCompare(bId);
      if (cmp !== 0) return cmp;
    }
  }

  return 0;
}

/** Check if the given ref is the latest version */
export function isLatestVersion(ref: string, latestTag: TagInfo | undefined): boolean {
  if (!latestTag) {
    return false;
  }
  return ref === latestTag.name || ref === latestTag.sha;
}

function parseSemverParts(
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
