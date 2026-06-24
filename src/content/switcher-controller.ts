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
  private active = false;
  private loading = false;
  private commandMode = false;
  private tabs: TabInfo[] = [];
  private index = 0;
  private queuedSteps = 0;
  private queuedEnd: 'commit' | 'cancel' | null = null;

  constructor(
    private readonly messenger: Messenger,
    private readonly overlay: SwitcherOverlay,
  ) {}

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
    this.overlay.render(tabs, this.index);

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

  private reset(): void {
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
