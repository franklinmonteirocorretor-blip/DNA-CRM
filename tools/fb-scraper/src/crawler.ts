import type { Page } from 'playwright';
import type { AppConfig } from './config';
import { logger } from './logger';
import type { CheckpointData } from './checkpoint';
import { loadCheckpoint, saveCheckpoint } from './checkpoint';

/**
 * Enters the Facebook photo viewer and navigates through all photos
 * sequentially, collecting high-resolution image URLs.
 *
 * Checkpoint is saved every 50 photos so we can resume after interruption.
 */
export async function scrollThroughViewerAndCollectImages(
  page: Page,
  config: AppConfig,
): Promise<{ urls: string[]; checkpoint: CheckpointData }> {
  let checkpoint = loadCheckpoint(config.checkpointFile);
  const collectedUrls = new Set<string>(checkpoint.foundUrls);
  const visitedCount = checkpoint.downloadedUrls.length;
  let lastCheckpointPhotoIndex = visitedCount;

  logger.info('Navigating to page...');
  await page.goto(config.url, { waitUntil: 'domcontentloaded', timeout: config.pageLoadTimeoutMs });
  await page.waitForTimeout(config.scrollDelayMs);

  logger.info('Finding first photo entry to open viewer...');

  // Click the first visible photo thumbnail to enter the photo viewer
  const clicked = await page.evaluate(() => {
    const candidates = [
      ...Array.from(document.querySelectorAll('a[href*="/photo"]')),
      ...Array.from(document.querySelectorAll('a[href*="fbid="]')),
    ];

    for (const a of candidates) {
      const rect = a.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 && rect.top > 0 && rect.left > 0) {
        (a as HTMLElement).click();
        return true;
      }
    }
    return false;
  });

  if (!clicked) {
    logger.info('No clickable photo found on page.');
    return { urls: [...collectedUrls], checkpoint };
  }

  await page.waitForTimeout(3000);
  logger.info('Viewer opened. Navigating through photos...');

  // If resuming, skip already-processed photos in the viewer
  if (visitedCount > 0) {
    logger.info(`Resuming — fast-forwarding past ${visitedCount} photos...`);
    for (let i = 0; i < visitedCount; i++) {
      await advanceToNextPhoto(page);
      await page.waitForTimeout(200);
    }
  }

  const maxTotalPhotos = 5000;

  for (let photoIndex = visitedCount; photoIndex < maxTotalPhotos; photoIndex++) {
    // Extract current high-res image URL
    const currentImgUrl = await extractCurrentImageUrl(page);
    if (currentImgUrl) {
      const isNew = !collectedUrls.has(currentImgUrl);
      if (isNew) {
        collectedUrls.add(currentImgUrl);
      }
    }

    // Log progress periodically
    if (photoIndex <= 5 || photoIndex % 50 === 0) {
      logger.info(`Photo ${photoIndex}: URL=${currentImgUrl?.substring(0, 100) ?? 'null'}, unique=${collectedUrls.size}`);
    }

    // Show total count on first iteration
    if (photoIndex === 0 || (visitedCount === 0 && photoIndex === 0)) {
      const total = await getTotalPhotoCountFromViewer(page);
      logger.info(`Viewer reports ${total} photos total.`);
    }

    // Navigate to next photo
    const advanced = await advanceToNextPhoto(page);
    if (!advanced) {
      logger.info('Cannot advance to next photo — end of album reached.');
      break;
    }

    await page.waitForTimeout(800);

    // Save checkpoint every 50 photos
    if (photoIndex - lastCheckpointPhotoIndex >= 50) {
      checkpoint = {
        foundUrls: [...collectedUrls],
        downloadedUrls: [...checkpoint.downloadedUrls],
        errors: checkpoint.errors,
      };
      saveCheckpoint(config.checkpointFile, checkpoint);
      lastCheckpointPhotoIndex = photoIndex;
      logger.info(`Checkpoint saved at photo ${photoIndex} (${collectedUrls.size} unique URLs)`);
    }

    if (photoIndex % 100 === 0 && photoIndex > 0) {
      logger.info(`Processed ${photoIndex} photos so far...`);
    }
  }

  // Final checkpoint
  checkpoint = {
    foundUrls: [...collectedUrls],
    downloadedUrls: [...checkpoint.downloadedUrls],
    errors: [],
  };
  saveCheckpoint(config.checkpointFile, checkpoint);

  const result = [...collectedUrls];
  logger.info(`Collected ${result.length} unique high-res image URLs`);
  return { urls: result, checkpoint };
}

/**
 * Extracts the full-resolution image URL from the currently displayed photo
 * in the Facebook photo viewer.
 *
 * Waits up to 3s for the high-res image to load, then extracts the largest
 * Facebook CDN image from the DOM.
 */
async function extractCurrentImageUrl(page: Page): Promise<string | null> {
  // Wait for the high-res image to appear
  try {
    await page.waitForSelector('img[src*="fbcdn"][data-visualcompletion]', { timeout: 3000 });
  } catch {
    // No high-res image found
  }

  return page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('img'));

    const ranked = imgs
      .map(img => ({
        src: img.src,
        width: img.naturalWidth || img.width || 0,
        height: img.naturalHeight || img.height || 0,
      }))
      .filter(x =>
        x.width > 300 &&
        x.height > 200 &&
        (x.src.includes('fbcdn') || x.src.includes('scontent'))
      )
      .sort((a, b) => (b.width * b.height) - (a.width * a.height));

    if (ranked.length > 0) {
      return ranked[0]!.src;
    }

    // Fallback: just take any Facebook image
    const fbImage = imgs.find(img =>
      (img.src.includes('fbcdn') || img.src.includes('scontent')) &&
      !img.src.includes('s206x206') && !img.src.includes('_thumbnail')
    );
    if (fbImage) return fbImage.src;

    return null;
  });
}

/**
 * Gets the "X / Y" total from the viewer counter.
 */
async function getTotalPhotoCountFromViewer(page: Page): Promise<number> {
  return page.evaluate(() => {
    const text = document.body.innerText;
    const match = text.match(/(\d+)\s*[\s\/–deof]+\s*(\d+)/i);
    if (match) return parseInt(match[2], 10);
    return 0;
  });
}

/**
 * Advance to the next photo in the Facebook viewer.
 * Strategies (in order):
 * 1. Click "Next" aria-label button
 * 2. Click the right side of the photo area (Facebook viewer navigation)
 * 3. Press ArrowRight via Playwright keyboard API
 */
async function advanceToNextPhoto(page: Page): Promise<boolean> {
  // Strategy 1: Click Next button
  const buttonResult = await page.evaluate(() => {
    const nextButton =
      document.querySelector('[aria-label="Next photo"]') ??
      document.querySelector('[aria-label="Next"]') ??
      document.querySelector('[aria-label="Show next photo"]') ??
      document.querySelector('[aria-label="Próxima"]') ??
      document.querySelector('[aria-label="Próxima foto"]') ??
      document.querySelector('[data-visualcompletion="ignore"] [aria-label="Next"]');

    if (nextButton) {
      (nextButton as HTMLElement).click();
      return 'button-clicked';
    }

    return 'no-button';
  });

  if (buttonResult === 'button-clicked') {
    await page.waitForTimeout(300);
    return true;
  }

  // Strategy 2: Click the right half of the image area
  await page.evaluate(() => {
    // Find the main photo viewer container and its visible image
    const images = Array.from(document.querySelectorAll('img'))
      .filter(img => {
        const rect = img.getBoundingClientRect();
        return rect.width > 400 && rect.height > 300 &&
          (img.src.includes('fbcdn') || img.src.includes('scontent'));
      })
      .sort((a, b) => {
        const ra = a.getBoundingClientRect();
        const rb = b.getBoundingClientRect();
        return (rb.width * rb.height) - (ra.width * ra.height);
      });

    if (images.length > 0) {
      const img = images[0]!;
      const rect = img.getBoundingClientRect();
      const clickX = rect.left + rect.width * 0.75;  // right portion
      const clickY = rect.top + rect.height * 0.5;   // vertical middle

      // Dispatch a real mouse click at this position
      img.dispatchEvent(new MouseEvent('click', {
        clientX: clickX,
        clientY: clickY,
        bubbles: true,
        cancelable: true,
      }));
    }
  });

  // Strategy 3: Press ArrowRight key
  await page.keyboard.press('ArrowRight');

  return true;
}