import fs from 'fs';
import https from 'https';
import http from 'http';
import path from 'path';
import { IncomingMessage } from 'http';
import { app, shell } from 'electron';

const DRIVER_PATH = '/Library/Audio/Plug-Ins/HAL/BlackHole2ch.driver';
const DOWNLOAD_URL = 'https://existential.audio/downloads/BlackHole2ch-0.7.0.pkg';

export function isBlackHoleInstalled(): boolean {
  return fs.existsSync(DRIVER_PATH);
}

export type ProgressCallback = (downloaded: number, total: number) => void;

/**
 * Download BlackHole pkg with resume support and retries.
 * Correctly handles HTTP 200 (full content, restart file) vs 206 (partial, append).
 * Returns path to the downloaded file.
 */
export async function downloadBlackHole(onProgress: ProgressCallback): Promise<string> {
  const dest = path.join(app.getPath('temp'), 'BlackHole2ch-0.7.0.pkg');
  const MAX_RETRIES = 10;
  const RETRY_DELAY_MS = 3000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await downloadChunk(DOWNLOAD_URL, dest, onProgress);
      return dest;
    } catch (err) {
      if (attempt === MAX_RETRIES) throw err;
      await sleep(RETRY_DELAY_MS);
    }
  }
  throw new Error('Max retries exceeded');
}

function downloadChunk(
  url: string,
  dest: string,
  onProgress: ProgressCallback,
  redirects = 0,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (redirects > 10) { reject(new Error('Too many redirects')); return; }

    const existingSize = fs.existsSync(dest) ? fs.statSync(dest).size : 0;

    const headers: Record<string, string> = existingSize > 0
      ? { Range: `bytes=${existingSize}-` }
      : {};

    const parsedUrl = new URL(url);
    const mod = parsedUrl.protocol === 'https:' ? https : http;

    const req = mod.get(url, { headers }, (res: IncomingMessage) => {
      // Follow redirects
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
        req.destroy();
        resolve(downloadChunk(res.headers.location, dest, onProgress, redirects + 1));
        return;
      }

      if (res.statusCode !== 200 && res.statusCode !== 206) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }

      // If server ignored Range and returned 200, we must restart the file
      const isResume = res.statusCode === 206;
      const fileFlags = isResume ? 'a' : 'w'; // append vs overwrite
      let downloaded = isResume ? existingSize : 0;

      // Total: for 206 parse from Content-Range, for 200 use Content-Length
      const contentLength = parseInt(res.headers['content-length'] ?? '0', 10);
      const contentRange = res.headers['content-range'];
      const total = contentRange
        ? parseInt(contentRange.split('/')[1] ?? '0', 10)
        : contentLength || 102889;

      const writeStream = fs.createWriteStream(dest, { flags: fileFlags });

      res.on('data', (chunk: Buffer) => {
        downloaded += chunk.length;
        onProgress(downloaded, total);
      });

      res.pipe(writeStream);
      writeStream.on('finish', resolve);
      writeStream.on('error', (e: Error) => { res.destroy(); reject(e); });
      res.on('error', (e: Error) => { writeStream.destroy(); reject(e); });
    });

    req.on('error', (e: Error) => reject(e));
    req.setTimeout(20_000, () => { req.destroy(new Error('Connection timeout')); });
  });
}

/** Validate that the path is in the system temp directory */
export function validatePkgPath(pkgPath: string): boolean {
  const tempDir = app.getPath('temp');
  return pkgPath.startsWith(tempDir) && pkgPath.endsWith('.pkg');
}

export async function openInstaller(pkgPath: string): Promise<void> {
  if (!validatePkgPath(pkgPath)) {
    throw new Error('Invalid installer path');
  }
  if (!fs.existsSync(pkgPath)) {
    throw new Error('Installer file not found');
  }
  const errMsg = await shell.openPath(pkgPath);
  if (errMsg) throw new Error(`Could not open installer: ${errMsg}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
