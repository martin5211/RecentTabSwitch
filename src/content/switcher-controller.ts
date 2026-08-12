import type { Messenger } from '../shared/messages';
import type { TabInfo } from '../shared/types';
import type { SwitcherOverlay } from './switcher-overlay';

/**
 * State machine for the switcher: open -> advance* -> commit/cancel. Talks to the
 * background (recent tabs / activation) and drives the overlay view.
 *
 * Because open() awaits a background round-trip, the user may release the modifier (commit)
 * or tap again (advance) before the tab list arrives. Those actions are queued while
 * loading and applied once the list is ready, so a quick tap-and-release still switches.
 */
export class SwitcherController {
  private static readonly FOCUS_POLL_MS = 500;

  private active = false;
  private loading = false;
  private commandMode = false;
  private tabs: TabInfo[] = [];
  private index = 0;
  private queuedSteps = 0;
  private queuedEnd: 'commit' | 'cancel' | null = null;
  private focusWatchdog: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly messenger: Messenger,
    private readonly overlay: SwitcherOverlay,
  ) {
    // Mouse interaction with the modal: a click outside the cards dismisses it (even
    // when keyboard focus is somewhere our key listeners can't see), a click on a card
    // switches to that tab.
    this.overlay.onCancel = () => this.cancel();
    this.overlay.onPick = (index) => {
      if (!this.active || this.loading) return;
      this.index = this.wrap(index);
      this.commit();
    };
  }

  get isActive(): boolean {
    return this.active;
  }

  /** When opened by the chrome.commands shortcut, commit happens on any modifier release. */
  get isCommandMode(): boolean {
    return this.commandMode;
  }

  async open(reverse: boolean, commandMode = false): Promise<void> {
    if (this.active) return;
    this.active = true;
    this.loading = true;
    this.commandMode = commandMode;
    this.queuedSteps = 0;
    this.queuedEnd = null;

    const tabs = await this.messenger.getRecent();
    this.loading = false;

    if (this.queuedEnd === 'cancel' || tabs.length === 0) {
      this.reset();
      return;
    }

    this.tabs = tabs;
    const start = reverse ? tabs.length - 1 : 0; // index 0 = most recent other tab
    this.index = this.wrap(start + this.queuedSteps);

    // Keyboard focus may sit somewhere our listeners can't see: the browser UI (address
    // bar, devtools) or an embedded frame (Jira/Splunk editors). The modifier keyup,
    // Escape and blur would all go there and never reach us, leaving the modal stuck
    // open — switch immediately instead.
    if (this.keysUnreachable()) {
      this.commit();
      return;
    }

    this.overlay.render(tabs, this.index);
    this.startFocusWatchdog();

    if (this.queuedEnd === 'commit') this.commit();
  }

  advance(reverse: boolean): void {
    if (!this.active) return;
    const step = reverse ? -1 : 1;
    if (this.loading) {
      this.queuedSteps += step;
      return;
    }
    if (this.tabs.length === 0) return;
    this.index = this.wrap(this.index + step);
    this.overlay.updateSelection(this.index);
  }

  commit(): void {
    if (!this.active) return;
    if (this.loading) {
      this.queuedEnd = 'commit';
      return;
    }
    const target = this.tabs[this.index];
    this.reset();
    if (target) void this.messenger.activate(target.id);
  }

  cancel(): void {
    if (!this.active) return;
    if (this.loading) {
      this.queuedEnd = 'cancel';
      return;
    }
    this.reset();
  }

  private wrap(i: number): number {
    const n = this.tabs.length || 1;
    return ((i % n) + n) % n;
  }

  /**
   * True when key events can't reach our window listeners. Two cases: focus is in the
   * browser UI (address bar, devtools — hasFocus() is false), or focus is inside an
   * embedded frame. The content script runs only in the top frame, so a focused iframe
   * swallows every key event — and the top document still reports hasFocus() === true,
   * which is why the active element must be checked separately.
   */
  private keysUnreachable(): boolean {
    if (!document.hasFocus()) return true;
    const tag = document.activeElement?.tagName;
    return tag === 'IFRAME' || tag === 'FRAME' || tag === 'OBJECT' || tag === 'EMBED';
  }

  /**
   * While the modal is open, keyboard focus can escape to somewhere keys can't reach us
   * without the page ever seeing a blur (focus mid-transition when we opened, or a click
   * into an embedded frame — our host is pointer-events:none, so clicks pass through).
   * No keyup can reach us then, so poll and commit ourselves rather than leave the modal
   * stuck.
   */
  private startFocusWatchdog(): void {
    this.focusWatchdog = setInterval(() => {
      if (this.keysUnreachable()) this.commit();
    }, SwitcherController.FOCUS_POLL_MS);
  }

  private reset(): void {
    if (this.focusWatchdog !== null) {
      clearInterval(this.focusWatchdog);
      this.focusWatchdog = null;
    }
    this.active = false;
    this.loading = false;
    this.commandMode = false;
    this.tabs = [];
    this.index = 0;
    this.queuedSteps = 0;
    this.queuedEnd = null;
    this.overlay.hide();
  }
}
