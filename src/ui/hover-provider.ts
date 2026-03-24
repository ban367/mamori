import * as vscode from "vscode";
import type { ActionResolver } from "../resolvers/action-resolver";
import type { ResolvedAction } from "../types";
import { parseDocument } from "../parsers/yaml-parser";

/**
 * Displays version details and command links on hover over `uses:` lines.
 */
export class ActionHoverProvider implements vscode.HoverProvider {
  constructor(private readonly resolver: ActionResolver) {}

  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.Hover | undefined {
    const references = parseDocument(document);

    const reference = references.find((ref) => ref.range.contains(position));
    if (!reference) {
      return undefined;
    }

    const resolved = this.resolver.getResolved(reference);
    if (!resolved) {
      return undefined;
    }

    const markdown = this.buildHoverContent(resolved);
    return new vscode.Hover(markdown, reference.range);
  }

  private buildHoverContent(resolved: ResolvedAction): vscode.MarkdownString {
    const { reference, status, currentTag, currentSha, latestVersion, latestSha, availableTags } =
      resolved;

    const md = new vscode.MarkdownString();
    md.isTrusted = true;
    md.supportThemeIcons = true;

    // Header
    const repoPath = reference.subPath
      ? `${reference.owner}/${reference.repo}/${reference.subPath}`
      : `${reference.owner}/${reference.repo}`;
    md.appendMarkdown(`**${repoPath}** @ \`${reference.ref}\`\n\n`);

    // Status
    switch (status) {
      case "latest":
        md.appendMarkdown(`$(check) **Latest version**\n\n`);
        break;
      case "updatable":
        md.appendMarkdown(`$(arrow-up) **Update available**\n\n`);
        break;
      case "deprecated":
        md.appendMarkdown(`$(warning) **Deprecated**\n\n`);
        break;
      case "unresolved":
        md.appendMarkdown(`$(question) **Unable to resolve version**\n\n`);
        if (resolved.errorMessage) {
          md.appendMarkdown(`${resolved.errorMessage}\n\n`);
        }
        return md;
    }

    // Details table
    md.appendMarkdown(`| | |\n|------|------|\n`);

    if (reference.refType === "commit-sha" && currentTag) {
      md.appendMarkdown(`| Tag | \`${currentTag}\` |\n`);
    }

    if (currentSha) {
      md.appendMarkdown(`| SHA | \`${currentSha.substring(0, 12)}\` |\n`);
    }

    if (latestVersion) {
      md.appendMarkdown(`| Latest | \`${latestVersion}\` |\n`);
    }

    if (latestSha) {
      md.appendMarkdown(`| Latest SHA | \`${latestSha.substring(0, 12)}\` |\n`);
    }

    md.appendMarkdown(`\n`);

    // Command links
    const refArg = encodeURIComponent(JSON.stringify({ line: reference.range.start.line }));
    md.appendMarkdown(
      `[$(versions) Change version](command:mamori.changeVersion?${refArg})`,
    );
    md.appendMarkdown(` | `);
    md.appendMarkdown(
      `[$(symbol-key) Toggle SHA/Tag](command:mamori.toggleHash?${refArg})`,
    );

    if (availableTags && availableTags.length > 0) {
      md.appendMarkdown(`\n\n---\n`);
      md.appendMarkdown(`*${availableTags.length} version(s) available*`);
    }

    return md;
  }
}
