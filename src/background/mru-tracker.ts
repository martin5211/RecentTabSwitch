/**
 * Tracks most-recently-used (MRU) tab order per window. Index 0 of each window's list
 * is the currently active tab; subsequent entries are previous tabs in recency order.
 */
export class MruTracker {
  private readonly byWindow = new Map<number, number[]>();
  private suspended = false;

  /** Register listeners synchronously (so the SW wakes on these events), then seed state. */
  start(): void {
    chrome.tabs.onActivated.addListener(({ tabId, windowId }) => {
      if (!this.suspended) this.touch(windowId, tabId);
    });
    chrome.tabs.onRemoved.addListener((tabId) => this.remove(tabId));
    chrome.windows.onRemoved.addListener((windowId) => this.byWindow.delete(windowId));
    void this.seed();
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

  private async seed(): Promise<void> {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id === undefined || tab.windowId === undefined) continue;
      const list = this.listFor(tab.windowId);
      if (list.includes(tab.id)) continue;
      if (tab.active) list.unshift(tab.id);
      else list.push(tab.id);
    }
  }

  /** Move a tab to the front of its window's recency list. */
  touch(windowId: number, tabId: number): void {
    const list = this.listFor(windowId);
    const i = list.indexOf(tabId);
    if (i !== -1) list.splice(i, 1);
    list.unshift(tabId);
  }

  remove(tabId: number): void {
    for (const list of this.byWindow.values()) {
      const i = list.indexOf(tabId);
      if (i !== -1) list.splice(i, 1);
    }
  }

  /** Recent tab ids for a window (most-recent first), excluding the active tab (index 0). */
  recentIds(windowId: number, max: number): number[] {
    const list = this.byWindow.get(windowId) ?? [];
    return list.slice(1, 1 + max);
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
