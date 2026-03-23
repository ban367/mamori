import * as vscode from "vscode";
import type { ResolvedAction, TagInfo } from "../types";

/** バージョン選択の結果（置換する値を含む） */
export interface VersionPickResult {
  tag: TagInfo;
  /** 実際にファイルに書き込む値 */
  value: string;
}

/**
 * バージョン選択QuickPickを表示する
 * 1. バージョンを選択
 * 2. タグ名 or SHAで置換するかを選択
 */
export async function showVersionQuickPick(
  resolved: ResolvedAction,
): Promise<VersionPickResult | undefined> {
  const tags = resolved.availableTags;
  if (!tags || tags.length === 0) {
    vscode.window.showInformationMessage("Mamori: 利用可能なバージョンがありません");
    return undefined;
  }

  // ステップ1: バージョン選択
  const items: (vscode.QuickPickItem & { tag: TagInfo })[] = tags.map((tag) => {
    const isCurrent = tag.name === resolved.reference.ref || tag.sha === resolved.reference.ref;
    const description = [
      tag.sha.substring(0, 7),
      isCurrent ? "（現在）" : undefined,
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
    title: `${resolved.reference.owner}/${resolved.reference.repo} - バージョンを選択`,
    placeHolder: "バージョンを選択してください",
  });

  if (!selected) {
    return undefined;
  }

  // ステップ2: タグ名 or SHA で置換するかを選択
  const formatItems: (vscode.QuickPickItem & { value: string })[] = [
    {
      label: `$(tag) ${selected.tag.name}`,
      description: "タグ名で置換",
      value: selected.tag.name,
    },
    {
      label: `$(key) ${selected.tag.sha}`,
      description: "SHA で置換",
      value: selected.tag.sha,
    },
  ];

  const format = await vscode.window.showQuickPick(formatItems, {
    title: `${selected.tag.name} - 置換形式を選択`,
    placeHolder: "タグ名またはSHAを選択してください",
  });

  if (!format) {
    return undefined;
  }

  return { tag: selected.tag, value: format.value };
}

/**
 * SHA/タグ変換先を選択するQuickPickを表示する
 */
export async function showHashToggleQuickPick(
  resolved: ResolvedAction,
): Promise<{ type: "sha" | "tag"; value: string } | undefined> {
  const items: (vscode.QuickPickItem & { result: { type: "sha" | "tag"; value: string } })[] = [];

  if (resolved.reference.refType === "commit-sha") {
    // SHA → タグへの変換
    if (resolved.currentTag) {
      items.push({
        label: `$(tag) タグに変換: ${resolved.currentTag}`,
        description: `${resolved.reference.ref.substring(0, 7)} → ${resolved.currentTag}`,
        result: { type: "tag", value: resolved.currentTag },
      });
    }
  } else {
    // タグ → SHAへの変換
    if (resolved.currentSha) {
      items.push({
        label: `$(key) SHAに変換: ${resolved.currentSha.substring(0, 12)}...`,
        description: `${resolved.reference.ref} → ${resolved.currentSha}`,
        result: { type: "sha", value: resolved.currentSha },
      });
    }
  }

  if (items.length === 0) {
    vscode.window.showInformationMessage("Mamori: 変換先が見つかりません");
    return undefined;
  }

  // 選択肢が1つの場合は直接実行
  if (items.length === 1) {
    return items[0].result;
  }

  const selected = await vscode.window.showQuickPick(items, {
    title: "SHA⇔タグ変換",
    placeHolder: "変換先を選択してください",
  });

  return selected?.result;
}
