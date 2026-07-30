import { cpSync as copySync, existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { BrowserContext, Page, chromium } from 'playwright';
import type { AppConfig } from './config';
import { logger } from './logger';

const TEMP_PROFILE_DIR = join(process.env.TEMP || process.env.TMP || '/tmp', 'fb-scraper-chrome-profile');

/**
 * Copies the Chrome profile directory to a temporary location so that
 * Playwright's launchPersistentContext can use it (Chrome refuses remote
 * debugging on the default User Data directory).
 */
function copyUserDataDir(sourceUserData: string, profileName: string): string {
  const sourceProfile = join(sourceUserData, profileName);
  const dest = TEMP_PROFILE_DIR;

  if (existsSync(dest)) {
    logger.info('Removing stale temp profile...');
    rmSync(dest, { recursive: true, force: true });
  }

  logger.info(`Copying profile "${profileName}" to temp dir...`);
  mkdirSync(dest, { recursive: true });

  // Copy only essential profile files (skip heavy caches to speed up)
  const essentialFiles = [
    'Preferences',
    'Login Data',
    'Login Data-journal',
    'Cookies',
    'Cookies-journal',
    'Network Persistent State',
    'Network Action Predictor',
    'Network Action Predictor-journal',
    'Reporting and NEL',
    'Reporting and NEL-journal',
    'TransportSecurity',
    'Trust Tokens',
    'Trust Tokens-journal',
    'Shortcuts',
    'Shortcuts-journal',
    'Web Data',
    'Web Data-journal',
    'Local Storage',
    'Session Storage',
    'IndexedDB',
    'Code Cache',
    'blob_storage',
    'Service Worker',
    'CacheStorage',
    'Application Cache',
    'Extensions',
  ];

  for (const name of essentialFiles) {
    const src = join(sourceProfile, name);
    if (existsSync(src)) {
      try {
        copySync(src, join(dest, name), { recursive: true });
      } catch {
        // skip files that fail to copy (e.g. locked by Chrome)
      }
    }
  }

  return dest;
}

export async function launchBrowser(config: AppConfig): Promise<{
  context: BrowserContext;
  page: Page;
}> {
  logger.info('Launching browser...');

  const useExistingProfile = config.chromeUserDataDir && config.chromeUserDataDir.trim() !== '';

  if (useExistingProfile) {
    logger.info(`Using existing Chrome profile: ${config.chromeUserDataDir} (${config.chromeProfile})`);

    // Copy profile to temp dir because Chrome blocks remote debugging on default User Data dir
    const tempUserDataDir = copyUserDataDir(config.chromeUserDataDir, config.chromeProfile);

    const context = await chromium.launchPersistentContext(tempUserDataDir, {
      headless: config.headless,
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      args: [
        '--disable-blink-features=AutomationControlled',
        // Do NOT use --profile-directory since we're copying the profile directly into the user data dir root
      ],
      viewport: config.viewport,
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      locale: 'pt-BR',
      timezoneId: 'America/Sao_Paulo',
    });

    const page = await context.newPage();
    page.setDefaultTimeout(config.pageLoadTimeoutMs);

    return { context, page };
  }

  // Fallback: fresh anonymous session
  const browser = await chromium.launch({
    headless: config.headless,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-dev-shm-usage',
    ],
  });

  const context = await browser.newContext({
    viewport: config.viewport,
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
  });

  const page = await context.newPage();
  page.setDefaultTimeout(config.pageLoadTimeoutMs);

  return { context, page };
}

export async function closeBrowser(context: BrowserContext): Promise<void> {
  logger.info('Closing browser...');

  // Force close without waiting for extensions etc.
  if (context.browser()) {
    try {
      context.browser()!.close();
    } catch {
      // browser may already be closed
    }
  }

  // Clean up temp profile
  try {
    if (existsSync(TEMP_PROFILE_DIR)) {
      rmSync(TEMP_PROFILE_DIR, { recursive: true, force: true });
      logger.info('Temp profile cleaned up.');
    }
  } catch {
    // best effort
  }
}