import type { SettingsStore } from '../shared/settings-store';
import type { LayoutDetector } from './layout-detector';
import type { SwitcherController } from './switcher-controller';
import { TriggerMatcher } from './trigger-matcher';

/**
 * Wires global keyboard/blur events to the switcher via the TriggerMatcher. Captures the
 * trigger in the capture phase and prevents default so the page never sees it.
 */
export class KeyboardController {
  private readonly keyDownRef = (e: KeyboardEvent): void => this.onKeyDown(e);
  private readonly keyUpRef = (e: KeyboardEvent): void => this.onKeyUp(e);
  // Only commit when the window itself loses focus; a capture-phase listener also sees
  // element blurs, which must not close the modal.
  private readonly blurRef = (e: FocusEvent): void => {
    if (e.target === window) this.switcher.commit();
  };

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

    window.addEventListener('keydown', this.keyDownRef, true);
    window.addEventListener('keyup', this.keyUpRef, true);
    window.addEventListener('blur', this.blurRef, true);
  }

  /**
   * After an extension update/reload this script is orphaned: chrome.runtime is dead but the
   * window listeners live on, silently eating the trigger key while the freshly injected
   * script also handles it. Detect that and unhook for good.
   */
  private detachIfOrphaned(): boolean {
    if (chrome.runtime?.id) return false;
    window.removeEventListener('keydown', this.keyDownRef, true);
    window.removeEventListener('keyup', this.keyUpRef, true);
    window.removeEventListener('blur', this.blurRef, true);
    return true;
  }

  private async refreshBinding(): Promise<void> {
    const code = await this.detector.resolve(this.settings.get());
    this.matcher.setBinding(TriggerMatcher.fromSettings(this.settings.get(), code));
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (this.detachIfOrphaned()) return;
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
    if (this.detachIfOrphaned()) return;
    if (!this.switcher.isActive) return;
    if (this.switcher.isCommandMode) {
      // Opened via the commands shortcut: commit when the held modifier is released.
      if (e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') this.switcher.commit();
      return;
    }
    if (this.matcher.isCommitRelease(e)) this.switcher.commit();
  }
}
