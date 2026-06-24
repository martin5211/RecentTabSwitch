# Privacy Policy — Recent Tab Switch

Recent Tab Switch runs entirely on your device. It does **not** send any data to any server,
and it has no analytics, tracking, or network calls of its own.

## What it stores

- **Settings** (trigger shortcut, max tabs, thumbnail toggle, blocklist) are stored in
  `chrome.storage.sync` so they follow your Chrome profile across devices via your Google
  account. They contain no browsing content.
- **Page thumbnails** are small JPEG screenshots of tabs you visit, used to render the
  switcher modal. They are:
  - stored **only locally** (`chrome.storage.local`) and **never synced or transmitted**;
  - limited to a small rolling cache (most recent ~30 tabs), older entries are discarded;
  - removed when the corresponding tab is closed.

## What it does not do

- It does not capture thumbnails of **incognito** tabs.
- It does not capture pages on domains you add to the **blocklist** (subdomains included), or
  non-`http(s)` pages such as `chrome://` pages and the Chrome Web Store.
- It does not read, collect, or transmit page content, form data, passwords, or history.

## Permissions

- `storage` — to save settings and the local thumbnail cache described above.
- `host_permissions: <all_urls>` — required to display the switcher overlay on any page,
  read tab titles/favicons, and capture thumbnails. No browsing data leaves your device.

## Removing data

Uninstalling the extension removes its local thumbnail cache. Synced settings can be cleared
from `chrome://extensions` or by resetting them on the Options page.
