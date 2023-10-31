import { describe, it } from 'node:test';
import assert from 'node:assert';

import testUnit from './rossmann.js';

describe('unit test: searchEngine/stores/rossmann/rossmann.js', () => {
  describe('productSearch()', () => {
    const givenEnv = {
      ROSSMANN_PRODUCT_SEARCH_API: 'someUrl',
    };

    it('should call fetch with the correct url', async (t) => {
      const givenQuery = 'query';
      const givenStoreAddressesMap = new Map();
      const givenResponse = { json: async () => ({}) };
      t.mock.method(global, 'fetch', async () => givenResponse);

      const expectedUrl = `${
        givenEnv.ROSSMANN_PRODUCT_SEARCH_API
      }/de/search/suggest?q=${encodeURI(givenQuery)}`;

      await testUnit.productSearch(
        givenQuery,
        givenStoreAddressesMap,
        givenEnv
      );

      assert.deepStrictEqual(fetch.mock.calls[0].arguments, [expectedUrl]);
    });

    it('should return an empty array if the search result is falsy', async (t) => {
      const givenQuery = 'query';
      const givenStoreAddressesMap = new Map();
      const givenResponse = { json() {} };
      t.mock.method(global, 'fetch', async () => givenResponse);
      t.mock.method(testUnit, 'mapProducts');

      const actualResult = await testUnit.productSearch(
        givenQuery,
        givenStoreAddressesMap,
        givenEnv
      );

      assert.deepStrictEqual(actualResult, []);
      assert.strictEqual(testUnit.mapProducts.mock.calls.length, 0);
    });

    it('should return an empty array if the search result has no products', async (t) => {
      const givenQuery = 'query';
      const givenStoreAddressesMap = new Map();
      const givenResponse = { json: async () => ({}) };
      t.mock.method(global, 'fetch', async () => givenResponse);
      t.mock.method(testUnit, 'mapProducts');

      const actualResult = await testUnit.productSearch(
        givenQuery,
        givenStoreAddressesMap,
        givenEnv
      );

      assert.deepStrictEqual(actualResult, []);
      assert.strictEqual(testUnit.mapProducts.mock.calls.length, 0);
    });

    it('should return an empty array if the search result products has no results', async (t) => {
      const givenQuery = 'query';
      const givenStoreAddressesMap = new Map();
      const givenResponse = { json: async () => ({ products: {} }) };
      t.mock.method(global, 'fetch', async () => givenResponse);
      t.mock.method(testUnit, 'mapProducts');

      const actualResult = await testUnit.productSearch(
        givenQuery,
        givenStoreAddressesMap,
        givenEnv
      );

      assert.deepStrictEqual(actualResult, []);
      assert.strictEqual(testUnit.mapProducts.mock.calls.length, 0);
    });

    it('should return the mapped products', async (t) => {
      const givenQuery = 'query';
      const givenStoreAddressesMap = new Map();
      const givenResponse = {
        json: async () => ({ products: { results: ['some', 'product'] } }),
      };
      t.mock.method(global, 'fetch', async () => givenResponse);
      const expectedResult = ['product1', 'product2'];
      t.mock.method(testUnit, 'mapProducts', () => expectedResult);

      const actualResult = await testUnit.productSearch(
        givenQuery,
        givenStoreAddressesMap,
        givenEnv
      );

      assert.deepStrictEqual(actualResult, expectedResult);
    });

    it('should return an empty array if something throws an error', async (t) => {
      const givenQuery = 'query';
      const givenStoreAddressesMap = new Map();
      t.mock.method(global, 'fetch', async () => {
        throw new Error('some error');
      });
      t.mock.method(testUnit, 'mapProducts');

      const actualResult = await testUnit.productSearch(
        givenQuery,
        givenStoreAddressesMap,
        givenEnv
      );

      assert.deepStrictEqual(actualResult, []);
    });
  });

  describe('mapProducts()', () => {
    it('should get the availability for each product', async (t) => {
      const givenProducts = [
        { dan: 'dan1', title: 'title1', price: 'price1', url: 'url1' },
        { dan: 'dan2', title: 'title2', price: 'price2', url: 'url2' },
      ];
      const givenStoreAddressesMap = new Map();
      const givenPostcodes = ['postcode1', 'postcode2'];
      const givenEnv = {
        ROSSMANN_PRODUCT_AVAILABILITY_API: 'someUrl',
      };
      t.mock.method(
        testUnit,
        'getProductAvailability',
        ({ dan }) => `availableAt_${dan}`
      );

      const expectedResult = [
        {
          gtin: givenProducts[0].code,
          title: givenProducts[0].name,
          imageUrl: `${givenProducts[0].teaserimageurl}?width=310&height=140&fit=bounds`,
          price: givenProducts[0].price,
          availableAt: `availableAt_${givenProducts[0].dan}`,
        },
        {
          gtin: givenProducts[1].code,
          title: givenProducts[1].name,
          imageUrl: `${givenProducts[1].teaserimageurl}?width=310&height=140&fit=bounds`,
          price: givenProducts[1].price,
          availableAt: `availableAt_${givenProducts[1].dan}`,
        },
      ];

      const actualResult = await testUnit.mapProducts(
        {
          products: givenProducts,
          storeAddressesMap: givenStoreAddressesMap,
          postcodes: givenPostcodes,
        },
        givenEnv
      );

      assert.deepStrictEqual(
        testUnit.getProductAvailability.mock.calls[0].arguments,
        [
          {
            dan: givenProducts[0].dan,
            storeAddressesMap: givenStoreAddressesMap,
            postcodes: givenPostcodes,
            price: givenProducts[0].price,
            url: givenProducts[0].url,
          },
          givenEnv,
        ]
      );
      assert.deepStrictEqual(
        testUnit.getProductAvailability.mock.calls[1].arguments,
        [
          {
            dan: givenProducts[1].dan,
            storeAddressesMap: givenStoreAddressesMap,
            postcodes: givenPostcodes,
            price: givenProducts[1].price,
            url: givenProducts[1].url,
          },
          givenEnv,
        ]
      );
      assert.deepStrictEqual(actualResult, expectedResult);
    });
  });

  describe('getProductAvailability()', () => {
    it('should call fetch with the correct url', async (t) => {
      const givenDan = 'someDan';
      const givenPostcodes = ['postcode1', 'postcode2'];
      const givenStoreAddressesMap = new Map();
      const givenPrice = 'somePrice';
      const givenUrl = 'someUrl';
      const givenEnv = {
        ROSSMANN_STORE_AVAILABILITY_API: 'someUrl',
      };
      const givenResponse = { json: async () => ({}) };
      t.mock.method(global, 'fetch', async () => givenResponse);
      t.mock.method(testUnit, 'mergeAvailabilityResult', () => {});

      const expectedUrl0 = `${givenEnv.ROSSMANN_STORE_AVAILABILITY_API}/storefinder/.rest/store?dan=${givenDan}&q=${givenPostcodes[0]}`;
      const expectedUrl1 = `${givenEnv.ROSSMANN_STORE_AVAILABILITY_API}/storefinder/.rest/store?dan=${givenDan}&q=${givenPostcodes[1]}`;

      await testUnit.getProductAvailability(
        {
          dan: givenDan,
          postcodes: givenPostcodes,
          storeAddressesMap: givenStoreAddressesMap,
          price: givenPrice,
          url: givenUrl,
        },
        givenEnv
      );

      assert.deepStrictEqual(fetch.mock.calls[0].arguments, [expectedUrl0]);
      assert.deepStrictEqual(fetch.mock.calls[1].arguments, [expectedUrl1]);
    });

    it('should call correctly and return mergeAvailabilityResult() for each response', async (t) => {
      const givenDan = 'someDan';
      const givenPostcodes = ['postcode0', 'postcode1'];
      const givenStoreAddressesMap = new Map();
      const givenPrice = 'somePrice';
      const givenUrl = 'someUrl';
      const givenEnv = {
        ROSSMANN_STORE_AVAILABILITY_API: 'someUrl',
      };

      const expectedResult = ['availabilityPostcode0', 'availabilityPostcode1'];

      t.mock.method(global, 'fetch');

      const givenResponse0 = { json: async () => expectedResult[0] };
      fetch.mock.mockImplementationOnce(async () => givenResponse0, 0);

      const givenResponse1 = { json: async () => expectedResult[1] };
      fetch.mock.mockImplementationOnce(async () => givenResponse1, 1);

      t.mock.method(testUnit, 'mergeAvailabilityResult');
      testUnit.mergeAvailabilityResult.mock.mockImplementationOnce(
        ({ availabilityMap }) => availabilityMap.set(0, expectedResult[0]),
        0
      );
      testUnit.mergeAvailabilityResult.mock.mockImplementationOnce(
        ({ availabilityMap }) => availabilityMap.set(1, expectedResult[1]),
        1
      );

      const actualResult = await testUnit.getProductAvailability(
        {
          dan: givenDan,
          postcodes: givenPostcodes,
          storeAddressesMap: givenStoreAddressesMap,
          price: givenPrice,
          url: givenUrl,
        },
        givenEnv
      );

      assert.deepStrictEqual(actualResult, expectedResult);
    });

    it('should do nothing there is an error', async (t) => {
      const givenDan = 'someDan';
      const givenPostcodes = ['postcode0'];
      const givenStoreAddressesMap = new Map();
      const givenPrice = 'somePrice';
      const givenUrl = 'someUrl';
      const givenEnv = {
        ROSSMANN_STORE_AVAILABILITY_API: 'someUrl',
      };

      t.mock.method(global, 'fetch', async () =>
        Promise.reject(new Error('some error'))
      );
      t.mock.method(testUnit, 'mergeAvailabilityResult');

      const actualResult = await testUnit.getProductAvailability(
        {
          dan: givenDan,
          postcodes: givenPostcodes,
          storeAddressesMap: givenStoreAddressesMap,
          price: givenPrice,
          url: givenUrl,
        },
        givenEnv
      );

      assert.deepStrictEqual(actualResult, []);
    });
  });

  describe('mergeAvailabilityResult()', () => {
    it('should not do anything if the availabilityResult is falsy', async () => {
      const givenAvailabilityMap = new Map();
      const givenAvailabilityResult = null;
      const givenStoreAddressesMap = new Map();

      testUnit.mergeAvailabilityResult({
        availabilityMap: givenAvailabilityMap,
        availabilityResult: givenAvailabilityResult,
        storeAddressesMap: givenStoreAddressesMap,
      });

      assert.strictEqual(givenAvailabilityMap.size, 0);
      assert.strictEqual(givenStoreAddressesMap.size, 0);
    });

    it('should not do anything if the availabilityResult has no stores', async () => {
      const givenAvailabilityMap = new Map();
      const givenAvailabilityResult = { store: null };
      const givenStoreAddressesMap = new Map();

      testUnit.mergeAvailabilityResult({
        availabilityMap: givenAvailabilityMap,
        availabilityResult: givenAvailabilityResult,
      });

      assert.strictEqual(givenAvailabilityMap.size, 0);
      assert.strictEqual(givenStoreAddressesMap.size, 0);
    });

    it('should not do anything if the product is not available', async () => {
      const givenAvailabilityMap = new Map();
      const givenAvailabilityResult = {
        store: [{ id: 'id1', productInfo: [{ available: false }] }],
      };
      const givenStoreAddressesMap = new Map();

      testUnit.mergeAvailabilityResult({
        availabilityMap: givenAvailabilityMap,
        availabilityResult: givenAvailabilityResult,
      });

      assert.strictEqual(givenAvailabilityMap.size, 0);
      assert.strictEqual(givenStoreAddressesMap.size, 0);
    });

    it('should not do anything if the product availability city is not Berlin', async () => {
      const givenAvailabilityMap = new Map();
      const givenAvailabilityResult = {
        store: [
          { id: 'id1', productInfo: [{ available: true }], city: 'someCity' },
        ],
      };
      const givenStoreAddressesMap = new Map();

      testUnit.mergeAvailabilityResult({
        availabilityMap: givenAvailabilityMap,
        availabilityResult: givenAvailabilityResult,
      });

      assert.strictEqual(givenAvailabilityMap.size, 0);
      assert.strictEqual(givenStoreAddressesMap.size, 0);
    });

    it('should not do anything if the availabilityMap already has the store', async () => {
      const givenAvailabilityMap = new Map();
      givenAvailabilityMap.set('ROSSMANN_id1', {});
      const givenAvailabilityResult = {
        store: [
          { id: 'id1', productInfo: [{ available: true }], city: 'Berlin' },
        ],
      };
      const givenStoreAddressesMap = new Map();

      testUnit.mergeAvailabilityResult({
        availabilityMap: givenAvailabilityMap,
        availabilityResult: givenAvailabilityResult,
      });

      assert.strictEqual(givenAvailabilityMap.size, 1);
      assert.strictEqual(givenStoreAddressesMap.size, 0);
    });

    it('should not do anything if the store is not in the store addresses object', async () => {
      const givenAvailabilityMap = new Map();
      const givenAvailabilityResult = {
        store: [
          { id: 'id1', productInfo: [{ available: true }], city: 'Berlin' },
        ],
      };
      const givenStoreAddressesMap = new Map();

      testUnit.mergeAvailabilityResult({
        availabilityMap: givenAvailabilityMap,
        availabilityResult: givenAvailabilityResult,
        storeAddressesMap: givenStoreAddressesMap,
      });

      assert.strictEqual(givenAvailabilityMap.size, 0);
      assert.strictEqual(givenStoreAddressesMap.size, 0);
    });

    it('should iterate over the availabilityResult stores and add them to the availabilityMap', async () => {
      const givenAvailabilityMap = new Map();
      const givenAvailabilityResult = {
        store: [
          { id: '330', productInfo: [{ available: true }], city: 'Berlin' },
          { id: '331', productInfo: [{ available: true }], city: 'Berlin' },
        ],
      };
      const givenStoreAddressesMap = new Map();
      const givenPrice = { formattedPrice: 'somePrice' };
      const givenUrl = 'someUrl';

      testUnit.mergeAvailabilityResult({
        availabilityMap: givenAvailabilityMap,
        availabilityResult: givenAvailabilityResult,
        storeAddressesMap: givenStoreAddressesMap,
        price: givenPrice,
        url: givenUrl,
      });

      assert.strictEqual(givenAvailabilityMap.size, 2);
      assert.strictEqual(givenStoreAddressesMap.size, 2);
    });
  });
});
