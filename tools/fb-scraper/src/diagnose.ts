/**
 * Opens page, enters viewer, and dumps all image-related elements.
 */
import { chromium } from 'playwright';
import { loadConfig } from './config';
import { existsSync, mkdirSync, cpSync, rmSync } from 'fs';
import { join } from 'path';

async function diagnose(): Promise<void> {
  const config = loadConfig('./config.json');
  const TEMP_PROFILE_DIR = join(process.env.TEMP || process.env.TMP || '/tmp', 'fb-scraper-chrome-diag');

  if (existsSync(TEMP_PROFILE_DIR)) {
    rmSync(TEMP_PROFILE_DIR, { recursive: true, force: true });
  }
  mkdirSync(TEMP_PROFILE_DIR, { recursive: true });
  const sp = join(config.chromeUserDataDir, config.chromeProfile);
  const files = ['Preferences','Login Data','Login Data-journal','Cookies','Cookies-journal',
    'Shortcuts','Shortcuts-journal','Web Data','Web Data-journal',
    'Local Storage','Session Storage','IndexedDB'];
  for (const f of files) {
    try { const src = join(sp, f); if (existsSync(src)) cpSync(src, join(TEMP_PROFILE_DIR, f), { recursive: true }); } catch {}
  }

  const context = await chromium.launchPersistentContext(TEMP_PROFILE_DIR, {
    headless: false,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--disable-blink-features=AutomationControlled'],
    viewport: config.viewport,
  });

  const page = await context.newPage();
  await page.goto(config.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Click first photo
  await page.evaluate(() => {
    const a = document.querySelector('a[href*="/photo"]') as HTMLElement;
    if (a) a.click();
  });
  await page.waitForTimeout(4000);

  // Wait for image to appear
  await page.waitForTimeout(2000);

  // Dump all image sources and other info
  const info = await page.evaluate(() => {
    const results: Record<string, unknown> = {};

    // ALL images
    const imgs = Array.from(document.querySelectorAll('img'));
    results['imgCount'] = imgs.length;
    results['images'] = imgs.slice(0, 20).map(img => ({
      tag: 'img',
      src: img.src?.substring(0, 200) ?? '',
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      width: img.width,
      height: img.height,
      alt: img.alt?.substring(0, 60),
      dataset: Object.keys(img.dataset),
    }));

    // All elements with background-image
    const bgEls = Array.from(document.querySelectorAll('*'));
    const bgImages: string[] = [];
    bgEls.forEach(el => {
      const bg = window.getComputedStyle(el).backgroundImage;
      if (bg && bg !== 'none' && bg.startsWith('url')) {
        bgImages.push(bg.substring(0, 200));
        if (bgImages.length >= 10) return;
      }
    });
    results['bgImages'] = bgImages;

    // Canvas elements
    const canvases = Array.from(document.querySelectorAll('canvas'));
    results['canvasCount'] = canvases.length;
    results['canvasDetails'] = canvases.slice(0, 5).map(c => ({
      width: c.width,
      height: c.height,
    }));

    return results;
  });

  console.log(JSON.stringify(info, null, 2));
  await context.close();
}

diagnose().catch(console.error);