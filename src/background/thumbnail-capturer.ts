/**
 * Captures the visible tab of a window and produces a small JPEG data URL using the
 * native OffscreenCanvas pipeline (decode -> downscale -> encode). Returns null on any
 * failure (e.g. chrome:// pages, rate limiting, the Web Store).
 */
export class ThumbnailCapturer {
  constructor(
    private readonly maxWidth = 320,
    private readonly maxHeight = 200,
    private readonly quality = 0.6,
  ) {}

  async capture(windowId: number): Promise<string | null> {
    try {
      const dataUrl = await chrome.tabs.captureVisibleTab(windowId, {
        format: 'jpeg',
        quality: 70,
      });
      if (!dataUrl) return null;
      return await this.downscale(dataUrl);
    } catch {
      return null;
    }
  }

  private async downscale(dataUrl: string): Promise<string> {
    const blob = await (await fetch(dataUrl)).blob();
    const bitmap = await createImageBitmap(blob);
    const ratio = Math.min(this.maxWidth / bitmap.width, this.maxHeight / bitmap.height, 1);
    const w = Math.max(1, Math.round(bitmap.width * ratio));
    const h = Math.max(1, Math.round(bitmap.height * ratio));

    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return dataUrl;
    }
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();

    const out = await canvas.convertToBlob({ type: 'image/jpeg', quality: this.quality });
    return ThumbnailCapturer.blobToDataUrl(out);
  }

  /** Encode a blob to a data URL without FileReader (unavailable in service workers). */
  private static async blobToDataUrl(blob: Blob): Promise<string> {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return `data:image/jpeg;base64,${btoa(binary)}`;
  }
}
