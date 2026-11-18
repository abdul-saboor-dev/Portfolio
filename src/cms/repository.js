import { cmsConfig } from './config.js';
import { publishedClient } from './client.js';
import { PORTFOLIO_CONTENT_QUERY } from './queries.js';
import { FALLBACK_CONTENT, validatePortfolioContent } from './validation.js';

function serializeError(error) {
  return {
    message: error instanceof Error ? error.message : 'Unknown content request failure.',
  };
}

export function createPortfolioRepository({ client, isConfigured = true } = {}) {
  let cachedResult = null;
  let inFlight = null;

  async function requestContent() {
    try {
      const raw = await client.fetch(PORTFOLIO_CONTENT_QUERY);
      const validated = validatePortfolioContent(raw);
      const result = {
        status: validated.issues.length > 0 ? 'partial' : 'ready',
        content: validated.content,
        issues: validated.issues,
        error: null,
      };
      cachedResult = result;
      return result;
    } catch (error) {
      return {
        status: 'error',
        content: FALLBACK_CONTENT,
        issues: [],
        error: serializeError(error),
      };
    } finally {
      inFlight = null;
    }
  }

  return {
    clear() {
      cachedResult = null;
      inFlight = null;
    },
    async getContent({ force = false } = {}) {
      if (!isConfigured || !client) {
        return {
          status: 'unconfigured',
          content: FALLBACK_CONTENT,
          issues: cmsConfig.issues.map((message) => ({ path: 'config', message })),
          error: null,
        };
      }

      if (!force && cachedResult) return cachedResult;
      if (!force && inFlight) return inFlight;

      inFlight = requestContent();
      return inFlight;
    },
  };
}

export const portfolioRepository = createPortfolioRepository({
  client: publishedClient,
  isConfigured: cmsConfig.isConfigured,
});
