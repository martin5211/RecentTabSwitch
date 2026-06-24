import type { SettingsStore } from '../shared/settings-store';
import type { Settings } from '../shared/types';
import { KeyRecorder, type RecordedKey } from './key-recorder';

const AUTO_LABEL = 'Auto (Ctrl + key right of left-Shift)';

/** Two-way binds the options form to the SettingsStore. */
export class OptionsController {
  private recorded: RecordedKey | null = null;

  constructor(
    private readonly settings: SettingsStore,
    private readonly doc: Document,
  ) {}

  async start(): Promise<void> {
    const settings = await this.settings.load();
    this.populate(settings);
    this.attachHandlers();
  }

  private el<T extends HTMLElement = HTMLElement>(id: string): T {
    return this.doc.getElementById(id) as T;
  }

  private populate(s: Settings): void {
    this.el<HTMLInputElement>(s.triggerMode === 'custom' ? 'mode-custom' : 'mode-auto').checked = true;
    this.el('trigger-label').textContent =
      s.triggerMode === 'custom'
        ? KeyRecorder.label({
            ctrlKey: s.customCtrl,
            altKey: s.customAlt,
            shiftKey: s.customShift,
            code: s.customCode,
          })
        : AUTO_LABEL;
    this.el<HTMLInputElement>('max-tabs').value = String(s.maxTabs);
    this.el<HTMLInputElement>('thumbnails').checked = s.thumbnails;
    this.el<HTMLInputElement>('restricted-multitab').checked = s.restrictedMultiTab;
    this.el<HTMLTextAreaElement>('blocklist').value = s.blocklist.join('\n');
  }

  private attachHandlers(): void {
    new KeyRecorder(this.el('record'), (key) => {
      this.recorded = key;
      this.el('trigger-label').textContent = key.label;
      this.el<HTMLInputElement>('mode-custom').checked = true;
    }).attach();

    this.el<HTMLInputElement>('mode-auto').addEventListener('change', () => {
      this.el('trigger-label').textContent = AUTO_LABEL;
    });

    this.el('save').addEventListener('click', () => void this.save());
  }

  private async save(): Promise<void> {
    const mode: Settings['triggerMode'] = this.el<HTMLInputElement>('mode-custom').checked
      ? 'custom'
      : 'auto';

    const patch: Partial<Settings> = {
      triggerMode: mode,
      maxTabs: this.clampTabs(this.el<HTMLInputElement>('max-tabs').value),
      thumbnails: this.el<HTMLInputElement>('thumbnails').checked,
      restrictedMultiTab: this.el<HTMLInputElement>('restricted-multitab').checked,
      blocklist: this.parseBlocklist(this.el<HTMLTextAreaElement>('blocklist').value),
    };

    if (mode === 'custom' && this.recorded) {
      patch.customCode = this.recorded.code;
      patch.customCtrl = this.recorded.ctrl;
      patch.customAlt = this.recorded.alt;
      patch.customShift = this.recorded.shift;
    }

    await this.settings.save(patch);
    this.flashStatus('Saved ✓');
  }

  private clampTabs(raw: string): number {
    const n = parseInt(raw, 10);
    if (Number.isNaN(n)) return 5;
    return Math.min(9, Math.max(1, n));
  }

  private parseBlocklist(raw: string): string[] {
    return raw
      .split('\n')
      .map((d) => d.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, ''))
      .filter(Boolean);
  }

  private flashStatus(text: string): void {
    const status = this.el('status');
    status.textContent = text;
    setTimeout(() => (status.textContent = ''), 1500);
  }
}
