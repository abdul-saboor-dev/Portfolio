import { visionTool } from '@sanity/vision';
import { defineConfig } from 'sanity';
import { presentationTool } from 'sanity/presentation';
import { structureTool } from 'sanity/structure';
import { schemaTypes } from './schemaTypes/index.js';
import { singletonTypes, structure } from './structure.js';

const projectId = process.env.SANITY_STUDIO_PROJECT_ID;
const dataset = process.env.SANITY_STUDIO_DATASET || 'production';
const previewUrl = process.env.SANITY_STUDIO_PREVIEW_URL || 'http://127.0.0.1:4173';

if (!projectId) {
  throw new Error(
    'SANITY_STUDIO_PROJECT_ID is required. Copy studio/.env.example to studio/.env.local.',
  );
}

export default defineConfig({
  name: 'portfolio',
  title: 'Abdul Saboor Portfolio',
  projectId,
  dataset,
  plugins: [
    structureTool({ structure }),
    presentationTool({
      previewUrl,
      allowOrigins: ['http://localhost:*', 'http://127.0.0.1:*'],
    }),
    visionTool({ defaultApiVersion: '2026-11-16' }),
  ],
  schema: {
    types: schemaTypes,
  },
  document: {
    drafts: { enabled: true },
    newDocumentOptions: (previous) =>
      previous.filter(({ templateId }) => !singletonTypes.has(templateId)),
    actions: (previous, { schemaType }) =>
      singletonTypes.has(schemaType)
        ? previous.filter(({ action }) => action !== 'duplicate' && action !== 'delete')
        : previous,
  },
});
