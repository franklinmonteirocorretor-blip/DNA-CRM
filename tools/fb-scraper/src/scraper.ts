import type { Page } from 'playwright';
import type { AppConfig } from './config';
import { logger } from './logger';
import { scrollThroughViewerAndCollectImages } from './crawler';
import { downloadImages } from './downloader';

export interface ScrapeResult {
  found: number;
  downloaded: number;
  duplicate: number;
  errors: number;
  elapsedSec: number;
}

export async function runScraper(
  page: Page,
  config: AppConfig,
): Promise<ScrapeResult> {
  const startTime = Date.now();

  logger.info('Opening photo viewer and navigating through all photos...');
  const { urls: highResUrls } = await scrollThroughViewerAndCollectImages(page, config);

  logger.info(`High-res URLs extracted: ${highResUrls.length}`);

  if (highResUrls.length === 0) {
    const elapsedSec = Math.round((Date.now() - startTime) / 1000);
    return { found: 0, downloaded: 0, duplicate: 0, errors: 0, elapsedSec };
  }

  logger.info('Downloading images...');
  const { stats } = await downloadImages(highResUrls, config.outputDir, config);

  const elapsedSec = Math.round((Date.now() - startTime) / 1000);

  return {
    found: highResUrls.length,
    downloaded: stats.downloaded,
    duplicate: stats.duplicate,
    errors: stats.error,
    elapsedSec,
  };
}