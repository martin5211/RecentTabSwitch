import { MSG } from '../shared/messages';
import type { SwitcherController } from './switcher-controller';

/**
 * Bridges the background chrome.commands shortcut to the in-page switcher: the first fire
 * opens the modal (in command mode), subsequent fires advance it. The commit happens when
 * the user releases the held modifier (see KeyboardController).
 */
export class CommandBridge {
  constructor(private readonly switcher: SwitcherController) {}

  start(): void {
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg?.type !== MSG.COMMAND_TRIGGER) return;
      const reverse = msg.reverse === true;
      if (this.switcher.isActive) this.switcher.advance(reverse);
      else void this.switcher.open(reverse, true);
    });
  }
}
