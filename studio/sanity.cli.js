import { defineCliConfig } from 'sanity/cli';

const projectId = process.env.SANITY_STUDIO_PROJECT_ID;
const dataset = process.env.SANITY_STUDIO_DATASET || 'production';

export default defineCliConfig({
  api: {
    projectId,
    dataset,
  },
  schemaExtraction: {
    enabled: true,
    path: './schema.json',
  },
  typegen: {
    enabled: false,
    path: '../src/cms/**/*.{js,jsx}',
    schema: './schema.json',
    generates: '../src/cms/sanity.types.ts',
    overloadClientMethods: false,
  },
});
