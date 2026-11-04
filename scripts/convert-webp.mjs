/**
 * convert-webp.mjs
 *
 * Converts all 340 portrait PNG frames to WebP using cwebp.
 * - Lossless alpha channel is preserved.
 * - Quality 90 lossy for RGB data, full lossless alpha.
 * - Runs up to 8 parallel workers for speed.
 * - Outputs into public/frames/ alongside PNGs (same basename, .webp extension).
 * - Reports per-file and total size savings.
 *
 * Usage: node scripts/convert-webp.mjs
 */

import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const FRAMES_DIR = new URL('../public/frames/', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const WEBP_DIR = new URL('../public/frames/', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const CONCURRENCY = 8;
const QUALITY = 90; // Quality for lossy RGB; alpha is always lossless

// Try cwebp first, fall back to ffmpeg
async function getCwebpPath() {
  try {
    const { stdout } = await execAsync('cwebp -version');
    console.log('Using cwebp:', stdout.trim());
    return 'cwebp';
  } catch {
    // Try global npm bin
    try {
      await execAsync('npx cwebp -version');
      return 'npx cwebp';
    } catch {
      return null;
    }
  }
}

async function convertWithCwebp(cwebpPath, pngPath, webpPath) {
  // -q: quality, -alpha_q 100: lossless alpha, -mt: multi-thread
  const cmd = `"${cwebpPath}" -q ${QUALITY} -alpha_q 100 -mt "${pngPath}" -o "${webpPath}"`;
  await execAsync(cmd, { timeout: 60000 });
}

async function convertWithFfmpeg(pngPath, webpPath) {
  // ffmpeg libwebp: quality 90, lossless=0 (lossy), preserve alpha
  const cmd = `ffmpeg -y -i "${pngPath}" -c:v libwebp -quality ${QUALITY} -compression_level 4 "${webpPath}"`;
  await execAsync(cmd, { timeout: 120000 });
}

async function getSize(filePath) {
  try {
    const s = await stat(filePath);
    return s.size;
  } catch {
    return 0;
  }
}

async function convertFile(cwebpPath, pngFile, index, total) {
  const pngPath = join(FRAMES_DIR, pngFile);
  const webpFile = pngFile.replace(/\.png$/i, '.webp');
  const webpPath = join(WEBP_DIR, webpFile);

  const pngSize = await getSize(pngPath);

  try {
    if (cwebpPath) {
      await convertWithCwebp(cwebpPath, pngPath, webpPath);
    } else {
      await convertWithFfmpeg(pngPath, webpPath);
    }

    const webpSize = await getSize(webpPath);
    const saving = pngSize - webpSize;
    const pct = pngSize > 0 ? (saving / pngSize * 100).toFixed(1) : '0.0';
    if (index % 20 === 0 || index === total - 1) {
      console.log(`[${String(index + 1).padStart(3)}/${total}] ${pngFile} → ${webpFile} | ${(pngSize/1024).toFixed(1)}KB → ${(webpSize/1024).toFixed(1)}KB (${pct}% saved)`);
    }
    return { pngSize, webpSize, success: true };
  } catch (err) {
    console.error(`[${index + 1}/${total}] FAILED: ${pngFile} — ${err.message}`);
    return { pngSize, webpSize: 0, success: false };
  }
}

async function runPool(tasks, concurrency) {
  const results = [];
  let i = 0;
  async function worker() {
    while (i < tasks.length) {
      const idx = i++;
      results[idx] = await tasks[idx]();
    }
  }
  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);
  return results;
}

async function main() {
  console.log('=== PNG → WebP Conversion ===\n');

  const cwebpPath = await getCwebpPath();
  if (!cwebpPath) {
    console.log('cwebp not found, using ffmpeg (slower)');
  }

  const allFiles = await readdir(FRAMES_DIR);
  const pngFiles = allFiles.filter(f => f.endsWith('.png')).sort();

  console.log(`Found ${pngFiles.length} PNG frames in ${FRAMES_DIR}`);
  console.log(`Using concurrency: ${CONCURRENCY}, quality: ${QUALITY}\n`);

  const tasks = pngFiles.map((f, idx) =>
    () => convertFile(cwebpPath, f, idx, pngFiles.length)
  );

  const start = Date.now();
  const results = await runPool(tasks, CONCURRENCY);
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  const successes = results.filter(r => r.success);
  const totalPng = results.reduce((s, r) => s + r.pngSize, 0);
  const totalWebp = results.reduce((s, r) => s + r.webpSize, 0);
  const totalSaved = totalPng - totalWebp;

  console.log('\n=== Conversion Summary ===');
  console.log(`Frames converted: ${successes.length} / ${pngFiles.length}`);
  console.log(`Time elapsed:     ${elapsed}s`);
  console.log(`Total PNG size:   ${(totalPng / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Total WebP size:  ${(totalWebp / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Total saved:      ${(totalSaved / 1024 / 1024).toFixed(2)} MB (${(totalSaved / totalPng * 100).toFixed(1)}%)`);

  if (successes.length !== pngFiles.length) {
    console.error(`\nWARNING: ${pngFiles.length - successes.length} frames FAILED to convert.`);
    process.exit(1);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
