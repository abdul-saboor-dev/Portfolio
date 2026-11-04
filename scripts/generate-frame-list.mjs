/**
 * generate-frame-list.mjs
 * Re-generates frameList.generated.js with .webp filenames.
 * Run: node scripts/generate-frame-list.mjs
 */
import { readdir, writeFile } from 'fs/promises';

const FRAMES_DIR = new URL('../public/frames/', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const OUT_FILE   = new URL('../src/features/portrait/frameList.generated.js', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');

const files = await readdir(FRAMES_DIR);
const webpFiles = files.filter(f => f.endsWith('.webp')).sort();

if (webpFiles.length !== 340) {
  throw new Error(`Expected 340 WebP files, found ${webpFiles.length}. Run convert-webp.mjs first.`);
}

const content = `export const FRAME_FILENAMES = [\n${webpFiles.map(f => `  "${f}"`).join(',\n')}\n];\n`;
await writeFile(OUT_FILE, content, 'utf8');

console.log(`Written ${webpFiles.length} filenames to frameList.generated.js`);
console.log('Sample [0]:', webpFiles[0]);
console.log('Sample [189]:', webpFiles[189]);
console.log('Sample [339]:', webpFiles[339]);
