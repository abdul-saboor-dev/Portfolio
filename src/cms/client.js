import { createClient } from '@sanity/client';
import { cmsConfig } from './config.js';

export const publishedClient = cmsConfig.isConfigured
  ? createClient({
      projectId: cmsConfig.projectId,
      dataset: cmsConfig.dataset,
      apiVersion: cmsConfig.apiVersion,
      perspective: 'published',
      useCdn: true,
    })
  : null;
