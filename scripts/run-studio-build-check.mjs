import { spawnSync } from 'node:child_process';

if (!process.env.npm_execpath) {
  throw new Error('Run this check through npm so the workspace command is available.');
}

const result = spawnSync(
  process.execPath,
  [process.env.npm_execpath, 'run', 'build', '--workspace', '@portfolio/studio'],
  {
    env: {
      ...process.env,
      SANITY_STUDIO_PROJECT_ID: process.env.SANITY_STUDIO_PROJECT_ID || 'aaaaaaaa',
      SANITY_STUDIO_DATASET: process.env.SANITY_STUDIO_DATASET || 'production',
      SANITY_STUDIO_PREVIEW_URL:
        process.env.SANITY_STUDIO_PREVIEW_URL || 'http://127.0.0.1:4173',
      DO_NOT_TRACK: '1',
    },
    stdio: 'inherit',
  },
);

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
