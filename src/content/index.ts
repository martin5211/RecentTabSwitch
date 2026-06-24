import { Messenger } from '../shared/messages';
import { SettingsStore } from '../shared/settings-store';
import { CommandBridge } from './command-bridge';
import { KeyboardController } from './keyboard-controller';
import { LayoutDetector } from './layout-detector';
import { SwitcherController } from './switcher-controller';
import { SwitcherOverlay } from './switcher-overlay';
import { TriggerMatcher } from './trigger-matcher';

// Guard against running twice when the background also injects us into a pre-existing tab.
const win = window as Window & { __recentTabSwitchLoaded?: boolean };
if (!win.__recentTabSwitchLoaded) {
  win.__recentTabSwitchLoaded = true;

  const settings = new SettingsStore();
  const detector = new LayoutDetector();
  const matcher = new TriggerMatcher();
  const overlay = new SwitcherOverlay();
  const messenger = new Messenger();
  const switcher = new SwitcherController(messenger, overlay);
  const keyboard = new KeyboardController(settings, detector, matcher, switcher);
  const commandBridge = new CommandBridge(switcher);

  void keyboard.start();
  commandBridge.start();
}
