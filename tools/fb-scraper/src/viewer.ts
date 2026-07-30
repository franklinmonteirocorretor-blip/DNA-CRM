import type { Page } from 'playwright';
import type { AppConfig } from './config';
import { logger } from './logger';

export async function extractHighResImageUrl(
  page: Page,
  photoPageUrl: string,
  config: AppConfig,
): Promise<string | null> {
  try {
    await page.goto(photoPageUrl, {
      waitUntil: 'domcontentloaded',
      timeout: config.pageLoadTimeoutMs,
    });

    await page.waitForSelector('img', { timeout: config.actionTimeoutMs }).catch(() => {
      logger.warn(`No img found on: ${photoPageUrl}`);
    });

    await page.waitForTimeout(1500);

    const imageUrl = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'));
      let bestUrl = '';
      let bestWidth = 0;

      for (const img of images) {
        const src = img.src || img.getAttribute('src');
        if (!src) continue;

        if (src.includes('static.xx.fbcdn.net') || src.includes('emoji')) continue;
        if (src.includes('profile') && src.includes('picture')) continue;

        const w = img.naturalWidth || img.width || 0;
        if (w >= bestWidth) {
          bestWidth = w;
          bestUrl = src;
        }
      }

      if (!bestUrl) {
        const allImgs = Array.from(document.querySelectorAll('img'));
        for (const img of allImgs) {
          const srcset = img.getAttribute('srcset') || '';
          if (!srcset) continue;
          for (const candidate of srcset.split(',').map(s => s.trim().split(' ')[0]!)) {
            if (candidate && candidate.includes('fbcdn')) {
              bestUrl = candidate;
              break;
            }
          }
          if (bestUrl) break;
        }
      }

      return bestUrl || null;
    });

    return imageUrl;
  } catch (err) {
    logger.error(`Failed to extract image from ${photoPageUrl}: ${String(err)}`);
    return null;
  }
}