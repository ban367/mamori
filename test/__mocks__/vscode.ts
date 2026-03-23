/** テスト用のvscodeモジュールモック */

export class Position {
  constructor(
    public readonly line: number,
    public readonly character: number,
  ) {}
}

export class Range {
  constructor(
    public readonly start: Position,
    public readonly end: Position,
  ) {}
}

export const window = {
  createTextEditorDecorationType: () => ({
    dispose: () => {},
  }),
  showQuickPick: async () => undefined,
  showInputBox: async () => undefined,
  showInformationMessage: async () => undefined,
  showWarningMessage: async () => undefined,
  showErrorMessage: async () => undefined,
  activeTextEditor: undefined,
  onDidChangeActiveTextEditor: () => ({ dispose: () => {} }),
};

export const workspace = {
  getConfiguration: () => ({
    get: (key: string, defaultValue?: unknown) => defaultValue,
  }),
  onDidChangeTextDocument: () => ({ dispose: () => {} }),
  onDidChangeConfiguration: () => ({ dispose: () => {} }),
};

export const commands = {
  registerCommand: () => ({ dispose: () => {} }),
};

export const languages = {
  registerHoverProvider: () => ({ dispose: () => {} }),
  registerCodeLensProvider: () => ({ dispose: () => {} }),
};

export class ThemeColor {
  constructor(public readonly id: string) {}
}

export const Uri = {
  parse: (value: string) => ({ toString: () => value }),
};

export const MarkdownString = class {
  isTrusted = false;
  supportThemeIcons = false;
  value: string;
  constructor(value = "") {
    this.value = value;
  }
  appendMarkdown(value: string) {
    this.value += value;
    return this;
  }
  appendCodeblock(value: string, language?: string) {
    this.value += `\n\`\`\`${language ?? ""}\n${value}\n\`\`\`\n`;
    return this;
  }
};

export enum Hover {}
