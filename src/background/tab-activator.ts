/** Activates (focuses) a tab and its window. */
export class TabActivator {
  async activate(tabId: number): Promise<void> {
    try {
      const tab = await chrome.tabs.get(tabId);
      await chrome.tabs.update(tabId, { active: true });
      if (tab.windowId !== undefined) {
        await chrome.windows.update(tab.windowId, { focused: true });
      }
    } catch {
      /* tab no longer exists */
    }
  }
}
