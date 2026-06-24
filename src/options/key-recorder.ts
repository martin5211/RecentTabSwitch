export interface RecordedKey {
  code: string;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  label: string;
}

/** Captures a keypress in a focused element and reports it as a friendly binding. */
export class KeyRecorder {
  constructor(
    private readonly input: HTMLElement,
    private readonly onRecord: (key: RecordedKey) => void,
  ) {}

  attach(): void {
    this.input.addEventListener('keydown', (e) => this.handle(e as KeyboardEvent));
  }

  private handle(e: KeyboardEvent): void {
    e.preventDefault();
    if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return; // wait for the real key
    this.onRecord({
      code: e.code,
      ctrl: e.ctrlKey,
      alt: e.altKey,
      shift: e.shiftKey,
      label: KeyRecorder.label(e),
    });
  }

  static label(e: { ctrlKey: boolean; altKey: boolean; shiftKey: boolean; code: string }): string {
    const parts: string[] = [];
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');
    parts.push(KeyRecorder.codeLabel(e.code));
    return parts.join(' + ');
  }

  static codeLabel(code: string): string {
    if (code.startsWith('Key')) return code.slice(3);
    if (code.startsWith('Digit')) return code.slice(5);
    const map: Record<string, string> = {
      IntlBackslash: '<',
      IntlRo: '\\',
      Comma: ',',
      Period: '.',
      Slash: '/',
      Semicolon: ';',
      Quote: "'",
      Backquote: '`',
      Minus: '-',
      Equal: '=',
      BracketLeft: '[',
      BracketRight: ']',
      Backslash: '\\',
      Space: 'Space',
    };
    return map[code] ?? code;
  }
}
