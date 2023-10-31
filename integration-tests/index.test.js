import { describe, it } from 'node:test';
import assert from 'node:assert';

import testUnit from '../src/index.js';
import expectedBody from './expectedBody.json' assert { type: 'json' };
import mocks from './mocks.js';

describe('integration test: main entry point', () => {
  it('should return the search results for the given query', async (t) => {
    const givenRequest = new Request(
      `https://example.com/?q=${encodeURI('aloe vera frosch waschmittel')}`
    );

    t.mock.method(global, 'fetch', async (url) => mocks.mockedFetch(url));

    const actualResponse = await testUnit.fetch(givenRequest, process.env);
    const actualBody = await actualResponse.json();

    assert.strictEqual(actualResponse.status, 200);
    assert.deepStrictEqual(actualBody, expectedBody);
  });
});
