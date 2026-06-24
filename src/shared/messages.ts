import type { GetRecentResponse, TabInfo } from './types';

/** Message type discriminators shared by content script and background. */
export const MSG = {
  GET_RECENT: 'GET_RECENT',
  ACTIVATE: 'ACTIVATE',
  /** background -> content: the chrome.commands shortcut fired; open or advance the modal. */
  COMMAND_TRIGGER: 'COMMAND_TRIGGER',
} as const;

/** Thin typed wrapper around chrome.runtime messaging used by the content script. */
export class Messenger {
  /** Ask the background for the current window's recent tabs (most-recent first). */
  async getRecent(): Promise<TabInfo[]> {
    try {
      const res = (await chrome.runtime.sendMessage({
        type: MSG.GET_RECENT,
      })) as GetRecentResponse | undefined;
      return res?.tabs ?? [];
    } catch {
      return [];
    }
  }

  /** Ask the background to activate (focus) the given tab. */
  async activate(tabId: number): Promise<void> {
    try {
      await chrome.runtime.sendMessage({ type: MSG.ACTIVATE, tabId });
    } catch {
      /* background unavailable */
    }
  }
}
