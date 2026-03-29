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
 * タグ名とSHAをフラットリストで表示し、1回の操作で選択・形式決定を行う。
 */
export async function showVersionQuickPick(
  resolved: ResolvedAction,
): Promise<VersionPickResult | undefined> {
  const tags = resolved.availableTags;
  if (!tags || tags.length === 0) {
    vscode.window.showInformationMessage("Mamori: No versions available");
    return undefined;
  }

  type PickItem = vscode.QuickPickItem & { tag?: TagInfo; value?: string };
  const items: PickItem[] = [];

  for (let i = 0; i < tags.length; i++) {
    const tag = tags[i];
    const isCurrent = tag.name === resolved.reference.ref || tag.sha === resolved.reference.ref;
    const checkMark = isCurrent ? "$(check) " : "";

    // セパレータでバージョンごとにグループ化
    if (i > 0) {
      items.push({ label: "", kind: vscode.QuickPickItemKind.Separator });
    }

    // タグ名で置換するアイテム
    items.push({
      label: `${checkMark}$(tag) ${tag.name}`,
      description: isCurrent ? "(current)" : undefined,
      tag,
      value: tag.name,
    });

    // SHAで置換するアイテム
    items.push({
      label: `$(key) ${tag.sha}`,
      tag,
      value: tag.sha,
    });
  }

  const selected = await vscode.window.showQuickPick(items, {
    title: `${resolved.reference.owner}/${resolved.reference.repo} - Select version`,
    placeHolder: "Select a version (tag name or SHA)",
  });

  if (!selected?.tag || !selected.value) {
    return undefined;
  }

  return { tag: selected.tag, value: selected.value };
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
