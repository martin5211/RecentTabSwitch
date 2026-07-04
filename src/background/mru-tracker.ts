/**
 * Tracks most-recently-used (MRU) tab order per window. Index 0 of each window's list
 * is the currently active tab; subsequent entries are previous tabs in recency order.
 *
 * The order is persisted to chrome.storage.session so it survives MV3 service-worker
 * suspension. Session storage is cleared when the browser exits (tab ids are invalid
 * by then anyway); on a fresh start the order is reconstructed from tab.lastAccessed,
 * which Chrome preserves across session restore.
 */
export class MruTracker {
  private static readonly STORAGE_KEY = 'mruOrder';

  private readonly byWindow = new Map<number, number[]>();
  private suspended = false;
  private ready: Promise<void> = Promise.resolve();

  /**
   * Register listeners synchronously (so the SW wakes on these events), then restore
   * state. Event mutations wait for the restore so they aren't clobbered by it.
   */
  start(): void {
    chrome.tabs.onActivated.addListener(({ tabId, windowId }) => {
      void this.ready.then(() => {
        if (!this.suspended) this.touch(windowId, tabId);
      });
    });
    chrome.tabs.onRemoved.addListener((tabId) => {
      void this.ready.then(() => this.remove(tabId));
    });
    chrome.windows.onRemoved.addListener((windowId) => {
      void this.ready.then(() => {
        this.byWindow.delete(windowId);
        this.save();
      });
    });
    chrome.tabs.onDetached.addListener((tabId, { oldWindowId }) => {
      void this.ready.then(() => this.detach(oldWindowId, tabId));
    });
    chrome.tabs.onAttached.addListener((tabId, { newWindowId }) => {
      void this.ready.then(() => this.attach(newWindowId, tabId));
    });
    chrome.tabs.onReplaced.addListener((addedTabId, removedTabId) => {
      void this.ready.then(() => this.replace(removedTabId, addedTabId));
    });
    this.ready = this.restore();
  }

  /** Resolves once persisted state has been restored; consumers must await this. */
  whenReady(): Promise<void> {
    return this.ready;
  }

  /** Snapshot of a window's recency list (copy), index 0 = current active tab. */
  order(windowId: number): number[] {
    return [...(this.byWindow.get(windowId) ?? [])];
  }

  /** Pause/resume reacting to tab activations — used while a blind cycle previews tabs. */
  suspendActivations(): void {
    this.suspended = true;
  }
  resumeActivations(): void {
    this.suspended = false;
  }

  private async restore(): Promise<void> {
    const [stored, tabs] = await Promise.all([
      chrome.storage.session.get(MruTracker.STORAGE_KEY),
      chrome.tabs.query({}),
    ]);
    const saved = (stored[MruTracker.STORAGE_KEY] ?? {}) as Record<string, number[]>;
    const live = new Map<number, chrome.tabs.Tab>();
    for (const tab of tabs) {
      if (tab.id !== undefined) live.set(tab.id, tab);
    }

    // Keep the saved per-window order for tabs that still exist in that window.
    for (const [key, ids] of Object.entries(saved)) {
      const windowId = Number(key);
      const list = ids.filter((id) => live.get(id)?.windowId === windowId);
      if (list.length > 0) this.byWindow.set(windowId, list);
    }

    // Fold in tabs the saved state doesn't know about, most-recent first. After a
    // browser restart nothing is saved, so this rebuilds the pre-restart order from
    // the lastAccessed timestamps Chrome restores with the session.
    const unknown = tabs
      .filter((tab) => tab.id !== undefined && !this.byWindow.get(tab.windowId)?.includes(tab.id))
      .sort((a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0));
    for (const tab of unknown) this.listFor(tab.windowId).push(tab.id!);

    for (const tab of tabs) {
      if (tab.active && tab.id !== undefined) this.touch(tab.windowId, tab.id);
    }
    this.save();
  }

  /** Move a tab to the front of its window's recency list. */
  touch(windowId: number, tabId: number): void {
    const list = this.listFor(windowId);
    const i = list.indexOf(tabId);
    if (i !== -1) list.splice(i, 1);
    list.unshift(tabId);
    this.save();
  }

  remove(tabId: number): void {
    for (const list of this.byWindow.values()) {
      const i = list.indexOf(tabId);
      if (i !== -1) list.splice(i, 1);
    }
    this.save();
  }

  /** Tab left its window (dragged to another one): drop it from the old list. */
  private detach(windowId: number, tabId: number): void {
    const list = this.byWindow.get(windowId);
    if (!list) return;
    const i = list.indexOf(tabId);
    if (i === -1) return;
    list.splice(i, 1);
    this.save();
  }

  /** Tab joined a window: slot it in behind the active tab (recent, but not current). */
  private attach(windowId: number, tabId: number): void {
    const list = this.listFor(windowId);
    if (list.includes(tabId)) return;
    list.splice(Math.min(1, list.length), 0, tabId);
    this.save();
  }

  /** Prerender navigation swapped the tab id; keep the entry's position. */
  private replace(oldTabId: number, newTabId: number): void {
    for (const list of this.byWindow.values()) {
      const i = list.indexOf(oldTabId);
      if (i !== -1) {
        list[i] = newTabId;
        this.save();
        return;
      }
    }
  }

  /** Recent tab ids for a window (most-recent first), excluding the active tab (index 0). */
  recentIds(windowId: number, max: number): number[] {
    const list = this.byWindow.get(windowId) ?? [];
    return list.slice(1, 1 + max);
  }

  private save(): void {
    const snapshot: Record<string, number[]> = {};
    for (const [windowId, list] of this.byWindow) snapshot[String(windowId)] = list;
    void chrome.storage.session.set({ [MruTracker.STORAGE_KEY]: snapshot });
  }

  private listFor(windowId: number): number[] {
    let list = this.byWindow.get(windowId);
    if (!list) {
      list = [];
      this.byWindow.set(windowId, list);
    }
    return list;
  }
}
