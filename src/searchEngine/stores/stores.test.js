import { describe, it } from 'node:test';
import assert from 'node:assert';

import testUnit from './stores.js';
import rossmann from './rossmann/rossmann.js';
import dm from './dm/dm.js';

describe('unit test: searchEngine/stores/stores.js', () => {
  describe('getStores()', () => {
    it('should return an array of stores', () => {
      const expectedResult = [rossmann, dm];

      const actualResult = testUnit.getStores();

      assert.deepStrictEqual(actualResult, expectedResult);
    });
  });
});
