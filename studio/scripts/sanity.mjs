import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';

const require = createRequire(import.meta.url);
const packagePath = require.resolve('sanity/package.json');
const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
const cliPath = resolve(dirname(packagePath), packageJson.bin.sanity);
const result = spawnSync(process.execPath, [cliPath, ...process.argv.slice(2)], {
  env: {
    ...process.env,
    DO_NOT_TRACK: '1',
  },
  stdio: 'inherit',
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
