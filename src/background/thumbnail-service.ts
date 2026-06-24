import type { SettingsStore } from '../shared/settings-store';
import type { ThumbnailCache } from './thumbnail-cache';
import type { ThumbnailCapturer } from './thumbnail-capturer';

/**
 * Owns thumbnail capture cadence. Captures the active tab shortly after it settles
 * (capture-on-activation), debounced per window and rate-limited to respect
 * captureVisibleTab's ~2 calls/sec ceiling. Applies skip rules (thumbnails disabled,
 * incognito, non-http(s), blocklisted domains).
 */
export class ThumbnailService {
  private static readonly DEBOUNCE_MS = 400;
  private static readonly MIN_INTERVAL_MS = 600;

  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();
  private lastCaptureAt = 0;

  constructor(
    private readonly settings: SettingsStore,
    private readonly capturer: ThumbnailCapturer,
    private readonly cache: ThumbnailCache,
  ) {}

  start(): void {
    chrome.tabs.onActivated.addListener(({ windowId }) => this.schedule(windowId));
    chrome.tabs.onUpdated.addListener((_tabId, info, tab) => {
      if (info.status === 'complete' && tab.active && tab.windowId !== undefined) {
        this.schedule(tab.windowId);
      }
    });
    chrome.tabs.onRemoved.addListener((tabId) => void this.cache.remove(tabId));
  }

  getThumb(tabId: number): Promise<string | undefined> {
    return this.cache.get(tabId);
  }

  private schedule(windowId: number): void {
    if (!this.settings.get().thumbnails) return;
    const pending = this.timers.get(windowId);
    if (pending) clearTimeout(pending);
    this.timers.set(
      windowId,
      setTimeout(() => void this.run(windowId), ThumbnailService.DEBOUNCE_MS),
    );
  }

  private async run(windowId: number): Promise<void> {
    this.timers.delete(windowId);
    const settings = this.settings.get();
    if (!settings.thumbnails) return;

    const [tab] = await chrome.tabs.query({ active: true, windowId });
    if (!tab || tab.id === undefined || tab.incognito) return;
    if (!ThumbnailService.isCapturable(tab.url, settings.blocklist)) return;

    const wait = ThumbnailService.MIN_INTERVAL_MS - (Date.now() - this.lastCaptureAt);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    this.lastCaptureAt = Date.now();

    const dataUrl = await this.capturer.capture(windowId);
    if (dataUrl) await this.cache.set(tab.id, dataUrl);
  }

  private static isCapturable(url: string | undefined, blocklist: string[]): boolean {
    if (!url) return false;
    let host: string;
    try {
      const u = new URL(url);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
      host = u.hostname;
    } catch {
      return false;
    }
    return !blocklist.some((d) => host === d || host.endsWith('.' + d));
  }
}
