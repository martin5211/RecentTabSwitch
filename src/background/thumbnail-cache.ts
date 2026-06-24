interface CacheData {
  /** tab ids ordered oldest -> newest (front is evicted first). */
  order: number[];
  map: Record<number, string>;
}

/**
 * LRU cache of thumbnail data URLs keyed by tab id, persisted to chrome.storage.local so
 * it survives service-worker restarts. Thumbnails are never synced (privacy).
 */
export class ThumbnailCache {
  private static readonly KEY = 'thumbnails';
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

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    const stored = await chrome.storage.local.get(ThumbnailCache.KEY);
    const data = stored[ThumbnailCache.KEY] as CacheData | undefined;
    if (data && Array.isArray(data.order) && data.map) this.data = data;
    this.loaded = true;
  }

  private async persist(): Promise<void> {
    await chrome.storage.local.set({ [ThumbnailCache.KEY]: this.data });
  }
}
