import { describe, it } from 'node:test';
import assert from 'node:assert';

import testUnit from './mocks.js';

describe('integration tests mocks', () => {
  it('should throw an error when no url matches', (t) => {
    const givenUrl = 'https://example.com/';

    t.mock.method(global, 'fetch', async (url) => testUnit.mockedFetch(url));

    const expectedError = new Error(`Unhandled URL: ${givenUrl}`);

    assert.rejects(async () => fetch(givenUrl), expectedError);
  });
});
