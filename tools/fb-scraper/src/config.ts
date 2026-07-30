import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

export interface AppConfig {
  url: string;
  outputDir: string;
  headless: boolean;
  parallelDownloads: number;
  maxRetries: number;
  scrollDelayMs: number;
  pageLoadTimeoutMs: number;
  actionTimeoutMs: number;
  maxScrollAttempts: number;
  viewport: { width: number; height: number };
  checkpointFile: string;
  chromeUserDataDir: string;
  chromeProfile: string;
}

export function loadConfig(configPath: string): AppConfig {
  if (!existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`);
  }

  const raw = readFileSync(configPath, 'utf-8');
  const parsed: unknown = JSON.parse(raw);

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Config must be a JSON object');
  }

  const user = parsed as Record<string, unknown>;

  const config: AppConfig = {
    url: String(user['url'] ?? ''),
    outputDir: resolve(String(user['outputDir'] ?? './downloads')),
    headless: booleanConfig(user['headless'], false),
    parallelDownloads: numberConfig(user['parallelDownloads'], 4),
    maxRetries: numberConfig(user['maxRetries'], 3),
    scrollDelayMs: numberConfig(user['scrollDelayMs'], 2000),
    pageLoadTimeoutMs: numberConfig(user['pageLoadTimeoutMs'], 30000),
    actionTimeoutMs: numberConfig(user['actionTimeoutMs'], 10000),
    maxScrollAttempts: numberConfig(user['maxScrollAttempts'], 200),
    viewport: viewportConfig(user['viewport']),
    checkpointFile: String(user['checkpointFile'] ?? './checkpoint.json'),
    chromeUserDataDir: String(user['chromeUserDataDir'] ?? ''),
    chromeProfile: String(user['chromeProfile'] ?? 'Default'),
  };

  if (!config.url || config.url.trim() === '') {
    throw new Error('Config "url" is required and must point to a Facebook photos page');
  }

  return config;
}

function booleanConfig(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  return fallback;
}

function numberConfig(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  return fallback;
}

function viewportConfig(value: unknown): { width: number; height: number } {
  if (
    typeof value === 'object' &&
    value !== null &&
    'width' in value &&
    'height' in value
  ) {
    const v = value as { width: unknown; height: unknown };
    const w = numberConfig(v.width, 1920);
    const h = numberConfig(v.height, 1080);
    return { width: w, height: h };
  }
  return { width: 1920, height: 1080 };
}