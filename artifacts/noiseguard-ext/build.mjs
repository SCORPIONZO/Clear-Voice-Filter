/**
 * Build script for NoiseGuard Chrome Extension.
 * Uses esbuild for fast bundling of all extension scripts.
 */

import esbuild from 'esbuild';
import { copyFileSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { deflateSync } from 'zlib';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isWatch = process.argv.includes('--watch');

const OUT = resolve(__dirname, 'dist');
mkdirSync(`${OUT}/popup`, { recursive: true });
mkdirSync(`${OUT}/icons`, { recursive: true });

// ── Common esbuild options ────────────────────────────────────────────────────
const common = {
  bundle: true,
  target: 'chrome112',
  sourcemap: isWatch ? 'inline' : false,
};

// ── Build functions ───────────────────────────────────────────────────────────
async function buildAll() {
  await Promise.all([
    // Background service worker (ESM — MV3 supports ESM workers)
    esbuild.build({
      ...common,
      entryPoints: ['src/background.ts'],
      outfile: `${OUT}/background.js`,
      format: 'esm',
    }),

    // Content script (IIFE — no dynamic imports needed)
    esbuild.build({
      ...common,
      entryPoints: ['src/content.ts'],
      outfile: `${OUT}/content.js`,
      format: 'iife',
    }),

    // Inject script — runs in page world (IIFE, must not import chrome APIs)
    esbuild.build({
      ...common,
      entryPoints: ['src/inject.ts'],
      outfile: `${OUT}/inject.js`,
      format: 'iife',
    }),

    // AudioWorklet — must be classic script, no dynamic imports
    esbuild.build({
      ...common,
      entryPoints: ['src/worklet.ts'],
      outfile: `${OUT}/worklet.js`,
      format: 'iife',
    }),

    // Popup script (ESM for popup window context)
    esbuild.build({
      ...common,
      entryPoints: ['src/popup/popup.ts'],
      outfile: `${OUT}/popup/popup.js`,
      format: 'esm',
    }),
  ]);
}

// ── Copy static files ─────────────────────────────────────────────────────────
function copyStatic() {
  copyFileSync('manifest.json', `${OUT}/manifest.json`);
  copyFileSync('src/popup/popup.html', `${OUT}/popup/popup.html`);
  copyFileSync('src/popup/popup.css', `${OUT}/popup/popup.css`);
}

// ── Generate PNG icons (pure Node.js, no native deps) ────────────────────────
function generateIcons() {
  [16, 48, 128].forEach((size) => {
    const png = createColorPNG(size, size, 0x00, 0xd4, 0xaa);
    writeFileSync(`${OUT}/icons/${size}.png`, png);
  });
}

/**
 * Creates a solid-color PNG using only Node.js built-in modules.
 * Uses zlib for DEFLATE compression (required by PNG spec).
 */
function createColorPNG(w, h, r, g, b) {
  // Row = filter byte (0x00 = None) + w × 3 RGB bytes
  const row = Buffer.alloc(1 + w * 3);
  row[0] = 0;
  for (let x = 0; x < w; x++) {
    row[1 + x * 3] = r;
    row[2 + x * 3] = g;
    row[3 + x * 3] = b;
  }
  // Add dark border for visibility
  const borderColor = [0x0a, 0x0a, 0x0f];
  for (let x = 0; x < w; x++) {
    if (x < 2 || x >= w - 2) {
      row[1 + x * 3] = borderColor[0];
      row[2 + x * 3] = borderColor[1];
      row[3 + x * 3] = borderColor[2];
    }
  }

  const rawData = Buffer.alloc(h * row.length);
  for (let y = 0; y < h; y++) {
    const borderY = y < 2 || y >= h - 2;
    if (borderY) {
      const borderRow = Buffer.alloc(1 + w * 3);
      borderRow[0] = 0;
      for (let x = 0; x < w; x++) {
        borderRow[1 + x * 3] = borderColor[0];
        borderRow[2 + x * 3] = borderColor[1];
        borderRow[3 + x * 3] = borderColor[2];
      }
      borderRow.copy(rawData, y * row.length);
    } else {
      row.copy(rawData, y * row.length);
    }
  }

  const compressed = deflateSync(rawData);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    chunk('IHDR', ihdr(w, h)),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function ihdr(w, h) {
  const buf = Buffer.alloc(13);
  buf.writeUInt32BE(w, 0);
  buf.writeUInt32BE(h, 4);
  buf.writeUInt8(8, 8);  // bit depth
  buf.writeUInt8(2, 9);  // color type: RGB
  return buf;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crc = crc32(Buffer.concat([typeBuf, data]));
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function crc32(buf) {
  const table = crc32.table ?? (crc32.table = buildCRCTable());
  let crc = 0xffffffff;
  for (const byte of buf) crc = (crc >>> 8) ^ table[(crc ^ byte) & 0xff];
  return (crc ^ 0xffffffff) >>> 0;
}
function buildCRCTable() {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
}

// ── Main ──────────────────────────────────────────────────────────────────────
if (isWatch) {
  const ctxs = await Promise.all([
    esbuild.context({ ...common, entryPoints: ['src/background.ts'], outfile: `${OUT}/background.js`, format: 'esm' }),
    esbuild.context({ ...common, entryPoints: ['src/content.ts'], outfile: `${OUT}/content.js`, format: 'iife' }),
    esbuild.context({ ...common, entryPoints: ['src/inject.ts'], outfile: `${OUT}/inject.js`, format: 'iife' }),
    esbuild.context({ ...common, entryPoints: ['src/worklet.ts'], outfile: `${OUT}/worklet.js`, format: 'iife' }),
    esbuild.context({ ...common, entryPoints: ['src/popup/popup.ts'], outfile: `${OUT}/popup/popup.js`, format: 'esm' }),
  ]);
  await Promise.all(ctxs.map((ctx) => ctx.watch()));
  copyStatic();
  generateIcons();
  console.log('[NoiseGuard] Watching for changes…');
} else {
  await buildAll();
  copyStatic();
  generateIcons();
  console.log('[NoiseGuard] Extension built → dist/');
  console.log('[NoiseGuard] Load in Chrome: chrome://extensions → Load unpacked → select dist/');
}
