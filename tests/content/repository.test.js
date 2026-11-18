import assert from 'node:assert/strict';
import test from 'node:test';
import { APPROVED_IDENTITY_TAGLINES } from '@portfolio/content-model';
import { createPortfolioRepository } from '../../src/cms/repository.js';

const validResponse = {
  profile: {
    fullName: 'Abdul Saboor',
    heroHeadline: null,
    heroIntroduction: null,
    portrait: null,
    cv: null,
    taglines: APPROVED_IDENTITY_TAGLINES.map((text) => ({ text })),
  },
  education: [],
  skillCategories: [],
  projects: [],
};

test('the repository caches published content outside animation lifecycles', async () => {
  let requestCount = 0;
  const repository = createPortfolioRepository({
    isConfigured: true,
    client: {
      async fetch() {
        requestCount += 1;
        return validResponse;
      },
    },
  });

  const first = await repository.getContent();
  const second = await repository.getContent();

  assert.equal(first.status, 'ready');
  assert.equal(second, first);
  assert.equal(requestCount, 1);
});

test('failed requests return safe fallback content and remain retryable', async () => {
  let requestCount = 0;
  const repository = createPortfolioRepository({
    isConfigured: true,
    client: {
      async fetch() {
        requestCount += 1;
        throw new Error('network unavailable');
      },
    },
  });

  const first = await repository.getContent();
  const second = await repository.getContent();

  assert.equal(first.status, 'error');
  assert.equal(first.content.profile.fullName, 'ABDUL SABOOR');
  assert.equal(second.status, 'error');
  assert.equal(requestCount, 2);
});

test('an unconfigured repository never attempts a remote request', async () => {
  const repository = createPortfolioRepository({
    isConfigured: false,
    client: {
      async fetch() {
        throw new Error('fetch must not run');
      },
    },
  });

  const result = await repository.getContent();

  assert.equal(result.status, 'unconfigured');
  assert.equal(result.content.profile.fullName, 'ABDUL SABOOR');
});
