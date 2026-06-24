import { MSG } from '../shared/messages';
import type { SettingsStore } from '../shared/settings-store';
import type { TabInfo } from '../shared/types';
import type { MruTracker } from './mru-tracker';
import type { TabActivator } from './tab-activator';
import type { ThumbnailService } from './thumbnail-service';

/** Routes runtime messages from content scripts to the appropriate services. */
export class BackgroundRouter {
  constructor(
    private readonly settings: SettingsStore,
    private readonly mru: MruTracker,
    private readonly thumbs: ThumbnailService,
    private readonly activator: TabActivator,
  ) {}

  start(): void {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (!msg || typeof msg.type !== 'string') return undefined;

      if (msg.type === MSG.GET_RECENT) {
        const windowId = sender.tab?.windowId;
        if (windowId === undefined) {
          sendResponse({ tabs: [] });
          return undefined;
        }
        void this.getRecent(windowId).then((tabs) => sendResponse({ tabs }));
        return true; // keep the channel open for the async response
      }

      if (msg.type === MSG.ACTIVATE && typeof msg.tabId === 'number') {
        void this.activator.activate(msg.tabId).then(() => sendResponse({ ok: true }));
        return true;
      }

      return undefined;
    });
  }

  private async getRecent(windowId: number): Promise<TabInfo[]> {
    const ids = this.mru.recentIds(windowId, this.settings.get().maxTabs);
    const result: TabInfo[] = [];
    for (const id of ids) {
      let tab: chrome.tabs.Tab;
      try {
        tab = await chrome.tabs.get(id);
      } catch {
        continue;
      }
      result.push({
        id,
        title: tab.title ?? '',
        url: tab.url ?? '',
        favIconUrl: tab.favIconUrl,
        thumbDataUrl: await this.thumbs.getThumb(id),
      });
    }
    return result;
  }
}
