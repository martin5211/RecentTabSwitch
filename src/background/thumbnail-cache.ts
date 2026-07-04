interface CacheData {
  /** tab ids ordered oldest -> newest (front is evicted first). */
  order: number[];
  map: Record<number, string>;
}

/**
 * LRU cache of thumbnail data URLs keyed by tab id, persisted to chrome.storage.session so
 * it survives service-worker restarts but is cleared when the browser exits — tab ids are
 * reassigned each session, so screenshots must not outlive theirs. Never synced (privacy).
 */
export class ThumbnailCache {
  private static readonly KEY = 'thumbnails';

  /** Pre-1.0.2 versions kept thumbnails in storage.local; wipe them on update. */
  static async clearLegacyLocalCache(): Promise<void> {
    await chrome.storage.local.remove(ThumbnailCache.KEY);
  }
  private data: CacheData = { order: [], map: {} };
  private loaded = false;

  constructor(private readonly capacity = 30) {}

  async get(tabId: number): Promise<string | undefined> {
    await this.ensureLoaded();
    return this.data.map[tabId];
  }

  async set(tabId: number, dataUrl: string): Promise<void> {
    await this.ensureLoaded();
    const existing = this.data.order.indexOf(tabId);
    if (existing !== -1) this.data.order.splice(existing, 1);
    this.data.order.push(tabId);
    this.data.map[tabId] = dataUrl;

    while (this.data.order.length > this.capacity) {
      const evicted = this.data.order.shift();
      if (evicted !== undefined) delete this.data.map[evicted];
    }
    await this.persist();
  }

  async remove(tabId: number): Promise<void> {
    await this.ensureLoaded();
    if (!(tabId in this.data.map)) return;
    delete this.data.map[tabId];
    const i = this.data.order.indexOf(tabId);
    if (i !== -1) this.data.order.splice(i, 1);
    await this.persist();
  }

  /** Move an entry to a new tab id (prerender navigations replace the tab id). */
  async rekey(oldTabId: number, newTabId: number): Promise<void> {
    await this.ensureLoaded();
    const thumb = this.data.map[oldTabId];
    if (thumb === undefined) return;
    delete this.data.map[oldTabId];
    this.data.map[newTabId] = thumb;
    const i = this.data.order.indexOf(oldTabId);
    if (i !== -1) this.data.order[i] = newTabId;
    await this.persist();
  }

  async clear(): Promise<void> {
    await this.ensureLoaded();
    this.data = { order: [], map: {} };
    await this.persist();
  }

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    const stored = await chrome.storage.session.get(ThumbnailCache.KEY);
    const data = stored[ThumbnailCache.KEY] as CacheData | undefined;
    if (data && Array.isArray(data.order) && data.map) this.data = data;
    this.loaded = true;
  }

  private async persist(): Promise<void> {
    await chrome.storage.session.set({ [ThumbnailCache.KEY]: this.data });
  }
}
