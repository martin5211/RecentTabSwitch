/** User-configurable settings, persisted to chrome.storage.sync (rides the Google account). */
export interface Settings {
  /** "auto" = Ctrl + physical key right of left-Shift (auto-detected per layout). */
  triggerMode: 'auto' | 'custom';
  /** event.code used when triggerMode === "custom". */
  customCode: string;
  customCtrl: boolean;
  customAlt: boolean;
  customShift: boolean;
  /** Max number of recent tabs shown in the switcher modal. */
  maxTabs: number;
  /** Whether to capture page thumbnails (screenshots). */
  thumbnails: boolean;
  /** Domains never screenshotted (subdomains included). */
  blocklist: string[];
  /**
   * On pages where the modal can't render (chrome://, New Tab, Web Store), the command
   * shortcut cycles through multiple recent tabs (true) or just toggles between the current
   * and most-recent tab (false).
   */
  restrictedMultiTab: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  triggerMode: 'auto',
  customCode: 'Backquote',
  customCtrl: true,
  customAlt: false,
  customShift: false,
  maxTabs: 5,
  thumbnails: true,
  blocklist: [],
  restrictedMultiTab: true,
};

/** A tab as presented in the switcher modal. */
export interface TabInfo {
  id: number;
  title: string;
  url: string;
  favIconUrl?: string;
  thumbDataUrl?: string;
}

/** Messages sent from the content script to the background service worker. */
export interface GetRecentRequest {
  type: 'GET_RECENT';
}
export interface GetRecentResponse {
  tabs: TabInfo[];
}
export interface ActivateRequest {
  type: 'ACTIVATE';
  tabId: number;
}
export type RequestMessage = GetRecentRequest | ActivateRequest;
