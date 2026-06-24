# Recent Tab Switch

A Chrome extension that switches tabs in most-recently-used order, the way Alt+Tab switches
windows. Hold a modifier, tap the trigger key to cycle through your recent tabs, and release
to land on the one you want. It's the Firefox-style "jump to the last tab" behavior that
Chrome never shipped, with a visual switcher so you can see where you're going.

## Why

Chrome's `Ctrl+Tab` walks tabs in strip order, left to right — rarely the tab you actually
want. Most of the time you're bouncing between the two or three tabs you've touched recently.
Recent Tab Switch tracks that order and puts the tab you were just on one keystroke away.

(Chrome reserves `Ctrl+Tab` for itself and won't let extensions bind it, which is why this
uses a different, rebindable shortcut.)

## How it works

Hold the trigger to open the switcher. It shows your recent tabs as a row of cards with
titles, favicons, and an optional page thumbnail. Each extra tap steps one tab further back;
add Shift to step the other way. Release the modifier to switch to the highlighted tab, or
press Escape to back out and stay put.

The default trigger is Ctrl plus the key just right of the left Shift — easy to reach, and
auto-detected per keyboard layout (`<` on ISO keyboards, `` ` `` on ANSI). You can rebind it
to any combination on the Options page.

On pages where an overlay can't be drawn — `chrome://` pages, the New Tab page, the Chrome
Web Store — a browser command takes over instead: `Alt+S` to cycle forward, `Alt+Shift+S` to
go back. These are rebindable at `chrome://extensions/shortcuts`.

### Binding Ctrl+Tab

Chrome's shortcut UI won't accept `Ctrl+Tab`, but you can still assign it to the command via
the internal `developerPrivate` API. Follow the console snippet in
[this Super User answer](https://superuser.com/questions/104917/chrome-tab-ordering/1326712#1326712):
run it on the `chrome://extensions/shortcuts` page, then bind the forward command to
`Ctrl+Tab` and the reverse command to `Ctrl+Shift+Tab`. Once set, `Ctrl+Tab` drives the
switcher everywhere.

## Install from source

```bash
npm install
npm run build        # bundles to dist/, then typechecks
```

Then load it in Chrome:

1. Open `chrome://extensions`
2. Turn on Developer mode
3. Click "Load unpacked" and select this folder
4. Reload the extension after each rebuild

Use `npm run watch` to rebuild on change while developing. The shipped extension has no
runtime dependencies.

## Settings

Open the Options page (toolbar icon, or the extension's entry in `chrome://extensions`) to
configure the trigger shortcut, how many recent tabs the switcher shows (default 5), whether
to capture page thumbnails, a blocklist of domains that should never be screenshotted, and
how the restricted-page fallback behaves (cycle through several tabs, or just toggle the last
two). Settings sync with your Chrome profile, so they follow you across devices.

## Good to know

- MRU order is tracked per window.
- Tabs that were open before you installed the extension work without a reload.
- `chrome://`, New Tab, Web Store, and similar pages can't be screenshotted, so they show as a
  favicon-and-title card.

## Privacy

Everything runs on your device — no network calls, no analytics, no tracking. Thumbnails are
small JPEGs kept in a local rolling cache, never synced or transmitted, and dropped when a tab
closes. Incognito tabs and blocklisted domains are never captured. See [PRIVACY.md](PRIVACY.md)
for the full details.
