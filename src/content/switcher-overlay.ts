import type { TabInfo } from '../shared/types';

// Fixed gray-translucent palette, locked with !important so page themes and extensions
// like Dark Reader can't recolor it. Paired with a MutationObserver (see installGuard)
// that strips any darkreader-injected styles from the shadow root.
const OVERLAY_CSS = `
:host { all: initial !important; }
.backdrop {
  position: fixed; inset: 0;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0, 0, 0, 0.35) !important;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}
.cards {
  display: flex; gap: 12px; flex-wrap: wrap; justify-content: center;
  max-width: min(90vw, 1100px);
  padding: 18px;
  background: rgba(38, 38, 41, 0.9) !important;
  border-radius: 14px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5) !important;
}
.card {
  width: 200px;
  border-radius: 10px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.06) !important;
  border: 2px solid transparent !important;
}
.card.selected {
  border-color: #4c8dff !important;
  background: rgba(76, 141, 255, 0.2) !important;
}
.thumb {
  width: 100%; height: 125px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0, 0, 0, 0.25) !important;
  overflow: hidden;
}
.thumb img { width: 100%; height: 100%; object-fit: cover; filter: none !important; }
.thumb img.fav-large { width: 48px; height: 48px; object-fit: contain; }
.meta {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 10px;
}
.meta .fav { width: 16px; height: 16px; flex: 0 0 auto; filter: none !important; }
.meta .title {
  color: #f2f2f2 !important; font-size: 13px; line-height: 1.3;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
`;

/** Renders the switcher modal inside a Shadow DOM so host-page CSS can't interfere. */
export class SwitcherOverlay {
  private host: HTMLElement | null = null;
  private root: ShadowRoot | null = null;
  private listEl: HTMLElement | null = null;

  render(tabs: TabInfo[], selected: number): void {
    this.ensure();
    if (!this.host!.isConnected) {
      document.documentElement.appendChild(this.host!);
      this.showTopLayer();
    }
    this.listEl!.replaceChildren(...tabs.map((tab, i) => this.card(tab, i === selected)));
  }

  /** Promote the host to the browser's top layer so no page z-index can cover it. */
  private showTopLayer(): void {
    const host = this.host as HTMLElement & { showPopover?: () => void };
    try {
      host.showPopover?.();
    } catch {
      /* already shown or popover unsupported — inline z-index is the fallback */
    }
  }

  updateSelection(selected: number): void {
    if (!this.listEl) return;
    Array.from(this.listEl.children).forEach((el, i) =>
      el.classList.toggle('selected', i === selected),
    );
  }

  hide(): void {
    this.host?.remove();
  }

  private ensure(): void {
    if (this.host) return;
    this.host = document.createElement('div');
    // Render in the browser top layer (above any page z-index) via the popover API.
    // The inline z-index is the fallback for browsers without popover support.
    this.host.setAttribute('popover', 'manual');
    this.host.style.cssText =
      'position:fixed !important;inset:0 !important;width:100% !important;height:100% !important;' +
      'margin:0 !important;padding:0 !important;border:0 !important;background:transparent !important;' +
      'z-index:2147483647 !important;pointer-events:none !important;';
    this.root = this.host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = OVERLAY_CSS;

    const backdrop = document.createElement('div');
    backdrop.className = 'backdrop';
    this.listEl = document.createElement('div');
    this.listEl.className = 'cards';
    backdrop.appendChild(this.listEl);

    this.root.append(style, backdrop);
    this.installDarkReaderGuard(this.root, style);
  }

  /** Remove any styles Dark Reader injects into our shadow root so our palette stays put. */
  private installDarkReaderGuard(root: ShadowRoot, ownStyle: HTMLStyleElement): void {
    const strip = (node: Node): void => {
      if (
        node instanceof HTMLElement &&
        node !== ownStyle &&
        (node.tagName === 'STYLE' || node.tagName === 'LINK') &&
        /darkreader/i.test(node.className + ' ' + (node.id || ''))
      ) {
        node.remove();
      }
    };
    new MutationObserver((mutations) => {
      for (const m of mutations) m.addedNodes.forEach(strip);
    }).observe(root, { childList: true, subtree: true });
  }

  private card(tab: TabInfo, selected: boolean): HTMLElement {
    const card = document.createElement('div');
    card.className = selected ? 'card selected' : 'card';

    const thumb = document.createElement('div');
    thumb.className = 'thumb';
    if (tab.thumbDataUrl) {
      const img = document.createElement('img');
      img.src = tab.thumbDataUrl;
      thumb.appendChild(img);
    } else if (tab.favIconUrl) {
      const img = document.createElement('img');
      img.className = 'fav-large';
      img.src = tab.favIconUrl;
      thumb.appendChild(img);
    }

    const meta = document.createElement('div');
    meta.className = 'meta';
    if (tab.favIconUrl) {
      const fav = document.createElement('img');
      fav.className = 'fav';
      fav.src = tab.favIconUrl;
      meta.appendChild(fav);
    }
    const title = document.createElement('span');
    title.className = 'title';
    title.textContent = tab.title || tab.url || 'Untitled';
    meta.appendChild(title);

    card.append(thumb, meta);
    return card;
  }
}
