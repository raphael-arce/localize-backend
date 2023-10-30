import { describe, it } from 'node:test';
import assert from 'node:assert';

import testUnit from './index.js';
import searchEngine from './searchEngine/searchEngine.js';

const env = {};
describe('unit test: main entry point', () => {
  describe('fetch()', () => {
    const headers = {
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'OPTIONS,GET',
    };

    it('should return a 400 error when no query is provided', async () => {
      const givenRequest = new Request('https://example.com/');

      const expectedResponse = new Response('No query provided', {
        status: 400,
        headers,
      });

      const actualResponse = await testUnit.fetch(givenRequest, env);

      assert.strictEqual(actualResponse.status, expectedResponse.status);
      assert.strictEqual(
        await actualResponse.text(),
        await expectedResponse.text()
      );
      assert.deepStrictEqual(actualResponse.headers, expectedResponse.headers);
    });

    it('should return a result when a query is provided', async (t) => {
      const givenRequest = new Request('https://example.com/?q=hello');
      const givenResponse = { products: [], storeAddresses: {} };

      const expectedResponse = new Response(JSON.stringify(givenResponse), {
        headers,
      });

      t.mock.method(searchEngine, 'search', async () => givenResponse);

      const actualResponse = await testUnit.fetch(givenRequest, env);

      assert.strictEqual(actualResponse.status, expectedResponse.status);
      assert.strictEqual(
        await actualResponse.text(),
        await expectedResponse.text()
      );
      assert.deepStrictEqual(actualResponse.headers, expectedResponse.headers);
    });

    it('should return a 500 error when something else goes wrong', async (t) => {
      const givenRequest = new Request('https://example.com/?q=hello');

      const expectedResponse = new Response('Internal Server Error.', {
        status: 500,
        headers,
      });

      t.mock.method(searchEngine, 'search', async () =>
        Promise.reject(new Error('Some error'))
      );

      const actualResponse = await testUnit.fetch(givenRequest, env);

      assert.strictEqual(actualResponse.status, expectedResponse.status);
      assert.strictEqual(
        await actualResponse.text(),
        await expectedResponse.text()
      );
      assert.deepStrictEqual(actualResponse.headers, expectedResponse.headers);
    });
  });
});
