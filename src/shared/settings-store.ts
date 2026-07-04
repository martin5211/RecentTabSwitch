import { DEFAULT_SETTINGS, type Settings } from './types';

type Listener = (settings: Settings) => void;

/**
 * Single source of truth for settings. Reads/writes chrome.storage.sync and keeps an
 * in-memory copy live via storage.onChanged. Reused by the background, content script,
 * and options page.
 */
export class SettingsStore {
  private current: Settings = { ...DEFAULT_SETTINGS };
  private readonly listeners = new Set<Listener>();
  private observing = false;

  /** Register the change observer (sync) and kick off the initial load. */
  start(): void {
    this.observe();
    void this.load();
  }

  /** Fetch settings from storage into the in-memory copy. */
  async load(): Promise<Settings> {
    const stored = (await chrome.storage.sync.get(DEFAULT_SETTINGS)) as Partial<Settings>;
    this.current = SettingsStore.sanitize(stored);
    return this.current;
  }

  /** Begin reflecting external changes (other tabs / synced devices) into memory. */
  observe(): void {
    if (this.observing) return;
    this.observing = true;
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'sync') return;
      let changed = false;
      const next: Record<string, unknown> = { ...this.current };
      for (const key of Object.keys(changes) as (keyof Settings)[]) {
        if (key in this.current) {
          next[key] = changes[key].newValue ?? DEFAULT_SETTINGS[key];
          changed = true;
        }
      }
      if (changed) {
        this.current = SettingsStore.sanitize(next as Partial<Settings>);
        this.listeners.forEach((l) => l(this.current));
      }
    });
  }

  /**
   * Never trust values coming from storage: they may be corrupted, edited by hand, or synced
   * from a different extension version. A bad maxTabs alone would blank the switcher.
   */
  private static sanitize(raw: Partial<Settings>): Settings {
    const d = DEFAULT_SETTINGS;
    const s = { ...d, ...raw } as Record<keyof Settings, unknown>;
    const maxTabs = Number(s.maxTabs);
    return {
      triggerMode: s.triggerMode === 'custom' ? 'custom' : 'auto',
      customCode:
        typeof s.customCode === 'string' && s.customCode.length > 0 ? s.customCode : d.customCode,
      customCtrl: s.customCtrl === true,
      customAlt: s.customAlt === true,
      customShift: s.customShift === true,
      maxTabs: Number.isFinite(maxTabs)
        ? Math.min(9, Math.max(1, Math.round(maxTabs)))
        : d.maxTabs,
      thumbnails: s.thumbnails !== false,
      blocklist: Array.isArray(s.blocklist)
        ? s.blocklist.filter((x): x is string => typeof x === 'string')
        : d.blocklist,
      restrictedMultiTab: s.restrictedMultiTab !== false,
    };
  }

  get(): Settings {
    return this.current;
  }

  async save(patch: Partial<Settings>): Promise<void> {
    this.current = { ...this.current, ...patch };
    await chrome.storage.sync.set(patch);
  }

  subscribe(listener: Listener): void {
    this.listeners.add(listener);
  }
}
