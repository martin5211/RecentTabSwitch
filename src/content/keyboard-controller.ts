import type { SettingsStore } from '../shared/settings-store';
import type { LayoutDetector } from './layout-detector';
import type { SwitcherController } from './switcher-controller';
import { TriggerMatcher } from './trigger-matcher';

/**
 * Wires global keyboard/blur events to the switcher via the TriggerMatcher. Captures the
 * trigger in the capture phase and prevents default so the page never sees it.
 */
export class KeyboardController {
  constructor(
    private readonly settings: SettingsStore,
    private readonly detector: LayoutDetector,
    private readonly matcher: TriggerMatcher,
    private readonly switcher: SwitcherController,
  ) {}

  async start(): Promise<void> {
    await this.settings.load();
    this.settings.observe();
    await this.refreshBinding();
    this.settings.subscribe(() => void this.refreshBinding());

    window.addEventListener('keydown', (e) => this.onKeyDown(e), true);
    window.addEventListener('keyup', (e) => this.onKeyUp(e), true);
    window.addEventListener('blur', () => this.switcher.commit(), true);
  }

  private async refreshBinding(): Promise<void> {
    const code = await this.detector.resolve(this.settings.get());
    this.matcher.setBinding(TriggerMatcher.fromSettings(this.settings.get(), code));
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (this.switcher.isActive && e.key === 'Escape') {
      e.preventDefault();
      this.switcher.cancel();
      return;
    }
    if (!this.matcher.isTrigger(e)) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.repeat) return; // ignore OS auto-repeat

    const reverse = this.matcher.isReverse(e);
    if (this.switcher.isActive) this.switcher.advance(reverse);
    else void this.switcher.open(reverse);
  }

  private onKeyUp(e: KeyboardEvent): void {
    if (!this.switcher.isActive) return;
    if (this.switcher.isCommandMode) {
      // Opened via the commands shortcut: commit when the held modifier is released.
      if (e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') this.switcher.commit();
      return;
    }
    if (this.matcher.isCommitRelease(e)) this.switcher.commit();
  }
}
