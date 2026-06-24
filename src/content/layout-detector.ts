import type { Settings } from '../shared/types';

interface KeyboardLayoutAPI {
  getLayoutMap(): Promise<Map<string, string>>;
}

/**
 * Resolves which event.code the trigger maps to. In "auto" mode it uses the key just left
 * of the "1" row: IntlBackslash ("<", the key right of left-Shift) on ISO layouts, which
 * doesn't exist on ANSI/English, so those fall back to Backquote ("`"). Detected via the
 * Keyboard Map API.
 */
export class LayoutDetector {
  private autoCode: string | null = null;

  async detectAuto(): Promise<string> {
    if (this.autoCode) return this.autoCode;
    try {
      const keyboard = (navigator as Navigator & { keyboard?: KeyboardLayoutAPI }).keyboard;
      if (keyboard?.getLayoutMap) {
        const map = await keyboard.getLayoutMap();
        this.autoCode = map.has('IntlBackslash') ? 'IntlBackslash' : 'Backquote';
        return this.autoCode;
      }
    } catch {
      /* fall through to default */
    }
    this.autoCode = 'Backquote';
    return this.autoCode;
  }

  async resolve(settings: Settings): Promise<string> {
    return settings.triggerMode === 'custom' ? settings.customCode : this.detectAuto();
  }
}
