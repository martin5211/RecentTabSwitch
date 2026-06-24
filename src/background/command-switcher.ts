import { MSG } from '../shared/messages';
import type { SettingsStore } from '../shared/settings-store';
import type { MruTracker } from './mru-tracker';
import type { TabActivator } from './tab-activator';

interface CycleSession {
  windowId: number;
  order: number[]; // stable snapshot, index 0 = the tab active when the cycle began
  index: number;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * Handles the chrome.commands shortcut (rebindable at chrome://extensions/shortcuts).
 * On a normal page it tells the content script to open/cycle the switcher modal. On pages
 * without a content script (chrome://, New Tab, Web Store) a modal can't be drawn, so it
 * either runs a "blind" multi-tab cycle over a stable MRU snapshot (default) or just toggles
 * to the most-recent tab (when restrictedMultiTab is disabled in options).
 */
export class CommandSwitcher {
  private static readonly FORWARD = 'switch-to-recent';
  private static readonly REVERSE = 'switch-to-recent-reverse';
  private static readonly CYCLE_TIMEOUT_MS = 1500;

  private session: CycleSession | null = null;

  constructor(
    private readonly settings: SettingsStore,
    private readonly mru: MruTracker,
    private readonly activator: TabActivator,
  ) {}

  start(): void {
    chrome.commands.onCommand.addListener((command) => {
      if (command === CommandSwitcher.FORWARD) void this.handle(false);
      else if (command === CommandSwitcher.REVERSE) void this.handle(true);
    });
  }

  private async handle(reverse: boolean): Promise<void> {
    // An in-progress blind cycle takes precedence (even if it has landed on a normal tab).
    if (this.session) {
      this.step(reverse);
      return;
    }

    const win = await chrome.windows.getLastFocused();
    if (win.id === undefined) return;

    const [tab] = await chrome.tabs.query({ active: true, windowId: win.id });
    if (tab?.id !== undefined && CommandSwitcher.isInjectable(tab.url)) {
      try {
        await chrome.tabs.sendMessage(tab.id, { type: MSG.COMMAND_TRIGGER, reverse });
        return; // content script drives the modal
      } catch {
        /* no content script on this tab — fall through */
      }
    }

    // No modal possible here (chrome://, New Tab, Web Store, …).
    if (this.settings.get().restrictedMultiTab) {
      this.startSession(win.id, reverse);
    } else {
      const [previous] = this.mru.recentIds(win.id, 1);
      if (previous !== undefined) await this.activator.activate(previous);
    }
  }

  /** Begin a blind MRU cycle: step through a stable snapshot, committing after a pause. */
  private startSession(windowId: number, reverse: boolean): void {
    const order = this.mru.order(windowId);
    if (order.length < 2) return;
    this.mru.suspendActivations();
    const index = reverse ? order.length - 1 : 1; // forward -> previous tab
    this.session = { windowId, order, index, timer: this.armTimer() };
    void this.activator.activate(order[index]);
  }

  private step(reverse: boolean): void {
    const s = this.session;
    if (!s) return;
    const n = s.order.length;
    s.index = ((s.index + (reverse ? -1 : 1)) % n + n) % n;
    clearTimeout(s.timer);
    s.timer = this.armTimer();
    void this.activator.activate(s.order[s.index]);
  }

  private armTimer(): ReturnType<typeof setTimeout> {
    return setTimeout(() => this.endSession(), CommandSwitcher.CYCLE_TIMEOUT_MS);
  }

  /** Finish the cycle: resume tracking and move the landed-on tab to the front of the MRU. */
  private endSession(): void {
    const s = this.session;
    this.session = null;
    if (!s) return;
    this.mru.resumeActivations();
    this.mru.touch(s.windowId, s.order[s.index]);
  }

  private static isInjectable(url: string | undefined): boolean {
    return !!url && /^(https?|file):/.test(url);
  }
}
