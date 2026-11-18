const env = typeof import.meta.env === 'object' ? import.meta.env : {};

const projectId = env.VITE_SANITY_PROJECT_ID?.trim() || '';
const dataset = env.VITE_SANITY_DATASET?.trim() || 'production';
const apiVersion = env.VITE_SANITY_API_VERSION?.trim() || '2026-11-16';

const issues = [];

if (projectId && !/^[a-z0-9-]+$/.test(projectId)) {
  issues.push('VITE_SANITY_PROJECT_ID has an invalid format.');
}

if (!/^[a-z0-9_-]+$/.test(dataset)) {
  issues.push('VITE_SANITY_DATASET has an invalid format.');
}

if (!/^\d{4}-\d{2}-\d{2}$/.test(apiVersion)) {
  issues.push('VITE_SANITY_API_VERSION must use YYYY-MM-DD format.');
}

export const cmsConfig = Object.freeze({
  apiVersion,
  dataset,
  issues: Object.freeze(issues),
  projectId,
  isConfigured: Boolean(projectId) && issues.length === 0,
});
