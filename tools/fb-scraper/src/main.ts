import { launchBrowser, closeBrowser } from './browser';
import { runScraper } from './scraper';
import { loadConfig } from './config';
import { logger } from './logger';

async function main(): Promise<void> {
  logger.info('Facebook Photo Scraper — Starting');

  const configPath = process.argv[2] ?? './config.json';
  const config = loadConfig(configPath);

  logger.info(`Target URL: ${config.url}`);
  logger.info(`Output directory: ${config.outputDir}`);
  logger.info(`Headless mode: ${config.headless}`);
  logger.info(`Parallel downloads: ${config.parallelDownloads}`);

  const { context, page } = await launchBrowser(config);

  try {
    const result = await runScraper(page, config);

    logger.success('\n=== Statistics Final ===');
    logger.info(`Images found:     ${result.found}`);
    logger.info(`Downloads:        ${result.downloaded}`);
    logger.info(`Duplicates:       ${result.duplicate}`);
    logger.info(`Errors:           ${result.errors}`);
    logger.info(`Elapsed time:     ${formatTime(result.elapsedSec)}`);
    logger.success('Done!');
  } catch (err) {
    logger.error(`Fatal error: ${String(err)}`);
    process.exitCode = 1;
  } finally {
    await closeBrowser(context);
  }
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

void main();