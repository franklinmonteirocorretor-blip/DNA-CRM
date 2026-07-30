import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { basename, join } from 'path';
import { get as httpGet } from 'http';
import { get as httpsGet } from 'https';
import type { AppConfig } from './config';
import { logger, createProgressBar } from './logger';

export interface DownloadResult {
  url: string;
  filepath: string | null;
  status: 'downloaded' | 'duplicate' | 'error';
}

export interface DownloadStats {
  downloaded: number;
  duplicate: number;
  error: number;
}

async function downloadSingle(
  url: string,
  outputDir: string,
  retries: number,
): Promise<{ filepath: string; downloaded: boolean }> {
  const parsed = new URL(url);
  const rawName = basename(parsed.pathname) || `fb_photo_${Date.now()}.jpg`;
  const parts = rawName.split('?')[0]!;

  const hasExt = /\.(png|jpg|jpeg|gif|webp|bmp)/i.test(parts);
  const cleanName = hasExt ? parts : `${parts}.jpg`;

  const filepath = join(outputDir, cleanName);

  if (existsSync(filepath)) {
    return { filepath, downloaded: false };
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await new Promise<void>((resolve, reject) => {
        const fetcher = url.startsWith('https') ? httpsGet : httpGet;
        const req = fetcher(url, { timeout: 30_000 }, (res) => {
          if (res.statusCode === 301 || res.statusCode === 302) {
            const redirectUrl = res.headers.location;
            if (redirectUrl) {
              req.destroy();
              httpsGet(redirectUrl, (redirectRes) => {
                const file = createWriteStream(filepath);
                redirectRes.pipe(file);
                file.on('finish', () => { file.close(); resolve(); });
                file.on('error', reject);
              }).on('error', reject);
              return;
            }
          }

          if (!res.statusCode || res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode ?? 'unknown'}`));
            return;
          }

          const file = createWriteStream(filepath);
          res.pipe(file);
          file.on('finish', () => { file.close(); resolve(); });
          file.on('error', reject);
        });

        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Request timed out'));
        });
        req.on('error', reject);
      });
      return { filepath, downloaded: true };
    } catch (err) {
      if (attempt < retries) {
        logger.warn(`Retry ${attempt}/${retries} for: ${cleanName}`);
        await new Promise(r => setTimeout(r, 1000 * attempt));
      } else {
        throw err;
      }
    }
  }

  return { filepath, downloaded: false };
}

export async function downloadImages(
  urls: string[],
  outputDir: string,
  config: AppConfig,
): Promise<{ results: DownloadResult[]; stats: DownloadStats }> {
  mkdirSync(outputDir, { recursive: true });

  const bar = createProgressBar(urls.length, 'Downloading');
  const results: DownloadResult[] = [];
  let downloaded = 0;
  let duplicate = 0;
  let errorCount = 0;

  const workers = Math.min(config.parallelDownloads, urls.length);
  const chunks: { url: string; index: number }[][] = [];
  for (let i = 0; i < urls.length; i += workers) {
    chunks.push(
      urls.slice(i, i + workers).map((url, idx) => ({ url, index: i + idx }))
    );
  }

  for (const chunk of chunks) {
    const batch = await Promise.allSettled(
      chunk.map(async ({ url }) => {
        try {
          const result = await downloadSingle(url, outputDir, config.maxRetries);
          if (result.downloaded) {
            return { url, filepath: result.filepath, status: 'downloaded' as const };
          } else {
            return { url, filepath: result.filepath, status: 'duplicate' as const };
          }
        } catch {
          return { url, filepath: null, status: 'error' as const };
        }
      }),
    );

    for (const settled of batch) {
      if (settled.status === 'fulfilled') {
        results.push(settled.value);
        if (settled.value.status === 'downloaded') downloaded++;
        else if (settled.value.status === 'duplicate') duplicate++;
        else errorCount++;
      } else {
        errorCount++;
        results.push({ url: '', filepath: null, status: 'error' });
      }
      bar.increment();
    }
  }

  bar.stop();
  return { results, stats: { downloaded, duplicate, error: errorCount } };
}