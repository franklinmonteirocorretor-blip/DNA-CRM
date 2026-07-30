import { readFileSync, writeFileSync, existsSync } from 'fs';

export interface CheckpointData {
  foundUrls: string[];
  downloadedUrls: string[];
  errors: string[];
}

export function loadCheckpoint(filepath: string): CheckpointData {
  if (!existsSync(filepath)) {
    return { foundUrls: [], downloadedUrls: [], errors: [] };
  }

  try {
    const raw = readFileSync(filepath, 'utf-8');
    const parsed: unknown = JSON.parse(raw);

    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('Invalid checkpoint format');
    }

    const data = parsed as Record<string, unknown>;

    return {
      foundUrls: ensureStringArray(data['foundUrls']),
      downloadedUrls: ensureStringArray(data['downloadedUrls']),
      errors: ensureStringArray(data['errors']),
    };
  } catch {
    return { foundUrls: [], downloadedUrls: [], errors: [] };
  }
}

export function saveCheckpoint(filepath: string, data: CheckpointData): void {
  writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
}

export function updateCheckpoint(
  filepath: string,
  data: CheckpointData,
  update: Partial<CheckpointData>,
): CheckpointData {
  const merged: CheckpointData = {
    foundUrls: [...new Set([...data.foundUrls, ...(update.foundUrls ?? [])])],
    downloadedUrls: [...new Set([...data.downloadedUrls, ...(update.downloadedUrls ?? [])])],
    errors: [...new Set([...data.errors, ...(update.errors ?? [])])],
  };

  saveCheckpoint(filepath, merged);
  return merged;
}

function ensureStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  return [];
}