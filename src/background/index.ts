import { SettingsStore } from '../shared/settings-store';
import { BackgroundRouter } from './background-router';
import { CommandSwitcher } from './command-switcher';
import { ContentInjector } from './content-injector';
import { MruTracker } from './mru-tracker';
import { TabActivator } from './tab-activator';
import { ThumbnailCache } from './thumbnail-cache';
import { ThumbnailCapturer } from './thumbnail-capturer';
import { ThumbnailService } from './thumbnail-service';

// All chrome event listeners are registered synchronously here so the service worker
// wakes for the events it cares about. Each component self-initializes asynchronously.
const settings = new SettingsStore();
const mru = new MruTracker();
const cache = new ThumbnailCache();
const capturer = new ThumbnailCapturer();
const thumbs = new ThumbnailService(settings, capturer, cache);
const activator = new TabActivator();
const router = new BackgroundRouter(settings, mru, thumbs, activator);
const injector = new ContentInjector();
const commandSwitcher = new CommandSwitcher(settings, mru, activator);

settings.start();
mru.start();
thumbs.start();
router.start();
injector.start();
commandSwitcher.start();

console.log('[RecentTabSwitch] background ready');
