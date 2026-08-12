# Changelog

## [1.0.4] - 2026-08-12

### Fixed

- The switcher no longer freezes when triggered while typing in an embedded frame (e.g.
  Jira or Splunk query editors). Key events inside a frame can't reach the extension, so
  the shortcut now switches straight to the most recent tab instead of leaving a stuck
  modal, matching the existing address-bar behavior.

### Added

- Mouse support in the switcher modal: clicking outside it dismisses it (works even when
  keyboard focus is somewhere the extension can't see), and clicking a tab card switches
  to that tab. As a result, clicks no longer pass through the backdrop to the page while
  the modal is open.

## [1.0.3] - 2026-07-17

Fixed stuck switcher modal when triggered from the address bar.

## [1.0.2] - 2026-07-04

Security, privacy, and stability hardening.

### Security / Privacy

- The switcher overlay's shadow root is now closed, so pages can no longer read the
  titles, URLs, favicons, or thumbnails of your other recent tabs from the DOM.
- Thumbnails moved from `chrome.storage.local` to `chrome.storage.session`: screenshots
  are cleared when the browser exits and can never be shown for an unrelated tab that
  reuses a previous session's tab id. Old local caches are wiped on update.
- Thumbnails are now removed when a tab navigates to a blocklisted or non-web page, and
  the whole cache is cleared when thumbnail capture is turned off.

### Fixed

- Clicking the toolbar icon now opens the Options page (previously did nothing).
- The key recorder rejects bindings without Ctrl/Alt, which would have hijacked normal
  typing on every page; stored bindings without a modifier fall back to the default.
- The modal no longer commits early when the page moves focus between its own elements;
  only the window itself losing focus commits.
- Fixed a race where a screenshot could be stored under the wrong tab if you switched
  tabs during the capture rate-limit wait.
- Closing a tab during a blind cycle (on `chrome://` pages) no longer corrupts the MRU
  order with a dead tab id.
- The trigger no longer fires when the Meta/Win key is also held.

### Stability

- Tabs dragged between windows now move between the windows' MRU lists immediately;
  previously the old window's switcher kept listing (and could activate) the moved tab.
- Prerendered navigations (`tabs.onReplaced`, common from Google Search) no longer drop
  the tab from the switcher or orphan its thumbnail.
- After an extension update/reload, orphaned content scripts detach their key listeners
  instead of silently swallowing the trigger key forever.
- Settings read from `chrome.storage.sync` are validated and clamped, so a corrupted
  value (e.g. a non-numeric `maxTabs`) can no longer blank the switcher.
- Rapid presses of the command shortcut can no longer start two overlapping blind cycles.
- Options page documents that the in-page shortcut doesn't fire while an embedded frame
  has focus (the browser-level shortcut covers that case).

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
