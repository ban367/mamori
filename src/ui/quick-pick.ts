import * as vscode from "vscode";
import type { ResolvedAction, TagInfo } from "../types";

/** Version pick result (includes the value to write to file) */
export interface VersionPickResult {
  tag: TagInfo;
  /** Value to write to the file */
  value: string;
}

/**
 * Show version selection QuickPick.
 * Step 1: Select a version
 * Step 2: Choose replacement format (tag name or SHA)
 */
export async function showVersionQuickPick(
  resolved: ResolvedAction,
): Promise<VersionPickResult | undefined> {
  const tags = resolved.availableTags;
  if (!tags || tags.length === 0) {
    vscode.window.showInformationMessage("Mamori: No versions available");
    return undefined;
  }

  // Step 1: Select version
  const items: (vscode.QuickPickItem & { tag: TagInfo })[] = tags.map((tag) => {
    const isCurrent = tag.name === resolved.reference.ref || tag.sha === resolved.reference.ref;
    const description = [
      tag.sha.substring(0, 7),
      isCurrent ? "(current)" : undefined,
    ]
      .filter(Boolean)
      .join(" · ");

    return {
      label: `${isCurrent ? "$(check) " : ""}${tag.name}`,
      description,
      tag,
    };
  });

  const selected = await vscode.window.showQuickPick(items, {
    title: `${resolved.reference.owner}/${resolved.reference.repo} - Select version`,
    placeHolder: "Select a version",
  });

  if (!selected) {
    return undefined;
  }

  // Step 2: Choose replacement format (tag name or SHA)
  const formatItems: (vscode.QuickPickItem & { value: string })[] = [
    {
      label: `$(tag) ${selected.tag.name}`,
      description: "Replace with tag name",
      value: selected.tag.name,
    },
    {
      label: `$(key) ${selected.tag.sha}`,
      description: "Replace with SHA",
      value: selected.tag.sha,
    },
  ];

  const format = await vscode.window.showQuickPick(formatItems, {
    title: `${selected.tag.name} - Select format`,
    placeHolder: "Select tag name or SHA",
  });

  if (!format) {
    return undefined;
  }

  return { tag: selected.tag, value: format.value };
}

/**
 * Show SHA/tag toggle QuickPick.
 */
export async function showHashToggleQuickPick(
  resolved: ResolvedAction,
): Promise<{ type: "sha" | "tag"; value: string } | undefined> {
  const items: (vscode.QuickPickItem & { result: { type: "sha" | "tag"; value: string } })[] = [];

  if (resolved.reference.refType === "commit-sha") {
    // SHA -> Tag
    if (resolved.currentTag) {
      items.push({
        label: `$(tag) Convert to tag: ${resolved.currentTag}`,
        description: `${resolved.reference.ref.substring(0, 7)} -> ${resolved.currentTag}`,
        result: { type: "tag", value: resolved.currentTag },
      });
    }
  } else {
    // Tag -> SHA
    if (resolved.currentSha) {
      items.push({
        label: `$(key) Convert to SHA: ${resolved.currentSha.substring(0, 12)}...`,
        description: `${resolved.reference.ref} -> ${resolved.currentSha}`,
        result: { type: "sha", value: resolved.currentSha },
      });
    }
  }

  if (items.length === 0) {
    vscode.window.showInformationMessage("Mamori: No conversion target found");
    return undefined;
  }

  if (items.length === 1) {
    return items[0].result;
  }

  const selected = await vscode.window.showQuickPick(items, {
    title: "Toggle SHA/Tag",
    placeHolder: "Select conversion target",
  });

  return selected?.result;
}
