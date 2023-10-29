import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';

import testUnit from './searchEngine.js';

import stores from './stores/stores.js';

describe('searchEngine/searchEngine.js', () => {
  describe('search()', () => {
    let storeMock;

    beforeEach(() => {
      storeMock = {
        productSearch: mock.fn(),
      };
    });

    it('should return early with empty products and storeAddresses if the query is empty', async () => {
      const givenQuery = '';

      const expectedResult = {
        products: [],
        storeAddresses: {},
      };

      const actualResult = await testUnit.search(givenQuery);

      assert.deepStrictEqual(actualResult, expectedResult);
    });

    it('should call store.productSearch(), reduceProducts() and return a correctly formed object', async (t) => {
      const givenQuery = 'query';
      const givenProducts = ['product1'];

      storeMock.productSearch.mock.mockImplementationOnce(
        async () => givenProducts
      );

      t.mock.method(stores, 'getStores', () => [storeMock, storeMock]);
      t.mock.method(testUnit, 'mergeResults', (results) => results[0]);

      const expectedResult = {
        products: givenProducts,
        storeAddresses: {},
      };

      const actualResult = await testUnit.search(givenQuery);

      assert.deepStrictEqual(actualResult, expectedResult);
    });
  });

  describe('mergeResults()', () => {
    it('should call mergeProducts for each result', async (t) => {
      const givenResults = [['product1'], ['product2']];

      t.mock.method(testUnit, 'mergeProducts', () => {});

      const expectedResult = [];
      const expectedProductMap = new Map();

      const actualResult = testUnit.mergeResults(givenResults);

      assert.deepStrictEqual(actualResult, expectedResult);
      assert.deepEqual(testUnit.mergeProducts.mock.calls[0].arguments, [
        givenResults[0],
        expectedProductMap,
      ]);
      assert.deepEqual(testUnit.mergeProducts.mock.calls[1].arguments, [
        givenResults[1],
        expectedProductMap,
      ]);
    });

    it('should get the value of each map entry', async (t) => {
      const givenResults = [['product1']];
      t.mock.method(testUnit, 'mergeProducts', (products, productMap) => {
        productMap.set(1, 'product1');
      });
      const expectedResult = ['product1'];

      const actualResult = testUnit.mergeResults(givenResults);

      assert.deepStrictEqual(actualResult, expectedResult);
    });
  });

  describe('mergeProducts()', () => {
    it('should call mergeProduct for each product', async (t) => {
      const givenProducts = ['product1', 'product2'];
      const givenProductMap = new Map();

      t.mock.method(testUnit, 'mergeProduct', () => {});

      testUnit.mergeProducts(givenProducts, givenProductMap);

      assert.deepEqual(testUnit.mergeProduct.mock.calls[0].arguments, [
        givenProducts[0],
        givenProductMap,
      ]);
      assert.deepEqual(testUnit.mergeProduct.mock.calls[1].arguments, [
        givenProducts[1],
        givenProductMap,
      ]);
    });
  });

  describe('mergeProduct()', () => {
    it('should return early if the product has no availability', async () => {
      const givenProduct = {
        availableAt: [],
      };
      const givenProductMap = new Map();

      const expectedProductMap = new Map();

      testUnit.mergeProduct(givenProduct, givenProductMap);

      assert.deepStrictEqual(givenProductMap, expectedProductMap);
    });

    it('should add the product to the productMap if it does not exist', async () => {
      const givenProduct = {
        gtin: 1,
        title: 'someTitle',
        imageUrl: 'someImageUrl',
        price: {
          formattedValue: '1€',
          value: 1,
        },
        availableAt: ['store_1'],
      };
      const givenProductMap = new Map();

      const expectedProductMap = new Map().set(1, {
        gtin: givenProduct.gtin,
        title: givenProduct.title,
        imageUrl: givenProduct.imageUrl,
        priceRange: {
          min: givenProduct.price.value,
          formattedMin: givenProduct.price.formattedValue,
          max: givenProduct.price.value,
          formattedMax: givenProduct.price.formattedValue,
        },
        availableAt: {
          type: 'FeatureCollection',
          features: givenProduct.availableAt,
        },
      });

      testUnit.mergeProduct(givenProduct, givenProductMap);

      assert.deepStrictEqual(givenProductMap, expectedProductMap);
    });

    it('should update the product if it exists in other stores', async (t) => {
      const givenProduct = {
        gtin: 1,
        availableAt: ['store_2'],
      };
      const givenProductMap = new Map().set(1, {
        gtin: 1,
        availableAt: {
          features: ['store_1'],
        },
      });

      t.mock.method(
        testUnit,
        'getUpdatedProductPriceRange',
        (product) => product
      );

      const expectedProductMap = new Map().set(1, {
        gtin: 1,
        availableAt: {
          features: ['store_1', 'store_2'],
        },
      });

      testUnit.mergeProduct(givenProduct, givenProductMap);

      assert.deepStrictEqual(givenProductMap, expectedProductMap);
    });
  });

  describe('getUpdatedProductPriceRange()', () => {
    it('should return the existing product if the price is the same', async () => {
      const givenExistingProduct = {
        priceRange: {
          min: 1,
          formattedMin: '1€',
          max: 1,
          formattedMax: '1€',
        },
      };
      const givenProduct = {
        price: {
          value: 1,
          formattedValue: '1€',
        },
      };

      const expectedProduct = {
        priceRange: {
          min: 1,
          formattedMin: '1€',
          max: 1,
          formattedMax: '1€',
        },
      };

      const actualProduct = testUnit.getUpdatedProductPriceRange(
        givenExistingProduct,
        givenProduct
      );

      assert.deepStrictEqual(actualProduct, expectedProduct);
    });

    it('should update the priceRange.min and priceRange.formattedMin correctly', async () => {
      const givenExistingProduct = {
        priceRange: {
          min: 2,
          formattedMin: '2€',
          max: 2,
          formattedMax: '2€',
        },
      };
      const givenProduct = {
        price: {
          value: 1,
          formattedValue: '1€',
        },
      };

      const expectedProduct = {
        priceRange: {
          min: 1,
          formattedMin: '1€',
          max: 2,
          formattedMax: '2€',
        },
      };

      const actualProduct = testUnit.getUpdatedProductPriceRange(
        givenExistingProduct,
        givenProduct
      );

      assert.deepStrictEqual(actualProduct, expectedProduct);
    });

    it('should update the priceRange.max and priceRange.formattedMax correctly', async () => {
      const givenExistingProduct = {
        priceRange: {
          min: 2,
          formattedMin: '2€',
          max: 2,
          formattedMax: '2€',
        },
      };
      const givenProduct = {
        price: {
          value: 3,
          formattedValue: '3€',
        },
      };

      const expectedProduct = {
        priceRange: {
          min: 2,
          formattedMin: '2€',
          max: 3,
          formattedMax: '3€',
        },
      };

      const actualProduct = testUnit.getUpdatedProductPriceRange(
        givenExistingProduct,
        givenProduct
      );

      assert.deepStrictEqual(actualProduct, expectedProduct);
    });

    it('should not update the priceRange if the price is between the min and max', async () => {
      const givenExistingProduct = {
        priceRange: {
          min: 2,
          formattedMin: '2€',
          max: 4,
          formattedMax: '4€',
        },
      };
      const givenProduct = {
        price: {
          value: 3,
          formattedValue: '3€',
        },
      };

      const expectedProduct = {
        priceRange: {
          min: 2,
          formattedMin: '2€',
          max: 4,
          formattedMax: '4€',
        },
      };

      const actualProduct = testUnit.getUpdatedProductPriceRange(
        givenExistingProduct,
        givenProduct
      );

      assert.deepStrictEqual(actualProduct, expectedProduct);
    });
  });
});
