import { writeFile } from 'node:fs/promises';
import { createAsMonogramSvg } from '../src/identity/asMonogram.js';

await writeFile('public/favicon.svg', `${createAsMonogramSvg()}\n`, 'utf8');

console.log('Generated public/favicon.svg from the shared AS monogram geometry');
