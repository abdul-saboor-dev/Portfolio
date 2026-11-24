import { createClient } from '@sanity/client';
import { access, readFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';

const args = process.argv.slice(2);
const commit = args.includes('--commit');
const catalogFlag = args.indexOf('--catalog');
const catalogPath = catalogFlag >= 0 ? resolve(args[catalogFlag + 1] || '') : '';

if (!catalogPath) {
  console.error(
    'Usage: npm run skills:import -- --catalog <ICON_CATALOG.json> [--commit]',
  );
  process.exitCode = 1;
} else {
  const records = JSON.parse(await readFile(catalogPath, 'utf8'));
  const catalogRoot = dirname(catalogPath);
  const missing = [];
  for (const record of records) {
    const imagePath = resolve(catalogRoot, record.png);
    try {
      await access(imagePath);
    } catch {
      missing.push(imagePath);
    }
  }

  if (missing.length) {
    console.error(`Missing ${missing.length} logo asset(s):\n${missing.join('\n')}`);
    process.exitCode = 1;
  } else if (!commit) {
    console.log(`Dry run: ${records.length} technology records are valid and ready.`);
    console.log('No Sanity documents or assets were changed. Add --commit to import.');
  } else {
    const projectId = process.env.SANITY_STUDIO_PROJECT_ID;
    const dataset = process.env.SANITY_STUDIO_DATASET || 'production';
    const token = process.env.SANITY_AUTH_TOKEN;
    if (!projectId || !token) {
      console.error(
        'SANITY_STUDIO_PROJECT_ID and SANITY_AUTH_TOKEN are required for --commit.',
      );
      process.exitCode = 1;
    } else {
      const client = createClient({
        apiVersion: '2026-11-16',
        dataset,
        projectId,
        token,
        useCdn: false,
      });
      const visibleSlugs = new Set([
        'html5',
        'css3',
        'javascript',
        'typescript',
        'react',
        'vite',
        'tailwind',
        'bootstrap',
        'nodejs',
        'express',
        'mongodb',
        'git',
        'github',
        'figma',
        'canva',
        'vscode',
        'cpp',
      ]);
      const existingIds = new Set(await client.fetch('*[_type == "skill"]._id'));
      let created = 0;
      let skipped = 0;

      for (const [order, record] of records.entries()) {
        const documentId = `skill-${record.slug}`;
        if (existingIds.has(documentId)) {
          skipped += 1;
          continue;
        }
        const categoryId = `skill-category-${record.category.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
        await client.createIfNotExists({
          _id: categoryId,
          _type: 'skillCategory',
          title: record.category,
          order,
        });
        const imagePath = resolve(catalogRoot, record.png);
        const asset = await client.assets.upload('image', await readFile(imagePath), {
          filename: basename(imagePath),
        });
        await client.create({
          _id: documentId,
          _type: 'skill',
          aliases: record.aliases ? record.aliases.split(/\s+/).filter(Boolean) : [],
          category: { _ref: categoryId, _type: 'reference' },
          logo: {
            _type: 'image',
            alt: `${record.label} logo`,
            asset: { _ref: asset._id, _type: 'reference' },
          },
          name: record.label,
          order,
          slug: { _type: 'slug', current: record.slug },
          status: 'Working With',
          visible: visibleSlugs.has(record.slug),
        });
        created += 1;
      }
      console.log(
        `Created ${created} skill records; preserved ${skipped} existing records.`,
      );
    }
  }
}
