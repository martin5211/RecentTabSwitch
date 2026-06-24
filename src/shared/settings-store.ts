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
    this.current = { ...DEFAULT_SETTINGS, ...stored };
    return this.current;
  }

  /** Begin reflecting external changes (other tabs / synced devices) into memory. */
  observe(): void {
    if (this.observing) return;
    this.observing = true;
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'sync') return;
      let changed = false;
      for (const key of Object.keys(changes) as (keyof Settings)[]) {
        if (key in this.current) {
          const next = changes[key].newValue;
          (this.current[key] as Settings[keyof Settings]) =
            next ?? DEFAULT_SETTINGS[key];
          changed = true;
        }
      }
      if (changed) this.listeners.forEach((l) => l(this.current));
    });
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
