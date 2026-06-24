/**
 * Injects the content script into tabs that were already open before the extension was
 * installed/updated (or restored at startup) — declared content scripts only attach to
 * pages loaded afterwards. A guard flag in the content script prevents double-injection.
 */
export class ContentInjector {
  start(): void {
    chrome.runtime.onInstalled.addListener(() => void this.injectAll());
    chrome.runtime.onStartup.addListener(() => void this.injectAll());
  }

  private async injectAll(): Promise<void> {
    const tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] });
    await Promise.all(
      tabs.map(async (tab) => {
        if (tab.id === undefined) return;
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['dist/content.js'],
          });
        } catch {
          /* restricted page, discarded tab, or already injected */
        }
      }),
    );
  }
}
