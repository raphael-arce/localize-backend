import { describe, it } from 'node:test';
import assert from 'node:assert';

import testUnit from './stores.js';
import dm from './dm/dm.js';

describe('searchEngine/stores/stores.js', () => {
  describe('getStores()', () => {
    it('should return an array of stores', () => {
      const expectedResult = [dm];

      const actualResult = testUnit.getStores();

      assert.deepStrictEqual(actualResult, expectedResult);
    });
  });
});
