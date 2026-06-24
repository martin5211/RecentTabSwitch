# Changelog

## [1.0.0] - 2026-06-24

Initail release.

### Added

- Most-recently-used tab switching: hold the trigger, tap to cycle through recent tabs,
  release to switch. Add Shift to cycle backwards, Escape to cancel.
- Alt+Tab-style switcher overlay showing recent tabs with titles, favicons, and page
  thumbnails.
- Auto-detected trigger shortcut (Ctrl plus the key right of left Shift), resolved per
  keyboard layout, with a custom rebindable option on the Options page.
- Browser-level command shortcuts (`Alt+S` / `Alt+Shift+S`) as a fallback for `chrome://`,
  New Tab, and Web Store pages where the overlay can't render.
- Options page: trigger shortcut, number of tabs shown (default 5), thumbnail capture toggle,
  per-domain thumbnail blocklist, and restricted-page cycle behavior. Settings sync across
  devices via `chrome.storage.sync`.
- Local-only thumbnail cache: small JPEGs kept in a rolling cache, never synced or transmitted,
  and removed when a tab closes. Incognito tabs and blocklisted domains are never captured.
- Automatic injection into tabs that were already open before install, so no reload is needed.
