import { describe, it } from 'node:test';
import assert from 'node:assert';
import STORES from './data/storesBerlin.json' assert { type: 'json' };
const givenSTORE_IDS = Object.keys(STORES);

import testUnit from './dm.js';

describe('unit test: searchEngine/stores/dm/dm.js', () => {
  describe('productSearch()', () => {
    const givenEnv = {
      DM_PRODUCT_SEARCH_API: 'someUrl',
    };

    it('should call fetch with the correct url', async (t) => {
      const givenQuery = 'query 1 äöüß';
      const givenStoreAddressesMap = new Map();

      const givenResponse = { json: async () => ({}) };

      t.mock.method(global, 'fetch', async () => givenResponse);

      const expectedUrl = `${
        givenEnv.DM_PRODUCT_SEARCH_API
      }/de/search?query=${encodeURI(
        givenQuery
      )}&searchType=product&type=search`;

      await testUnit.productSearch(
        givenQuery,
        givenStoreAddressesMap,
        givenEnv
      );

      assert.deepEqual(fetch.mock.calls[0].arguments, [expectedUrl]);
    });

    it('should return an empty array when there is no searchResult', async (t) => {
      const givenQuery = 'query';
      const givenStoreAddressesMap = new Map();

      const givenResponse = { json: async () => undefined };

      t.mock.method(global, 'fetch', async () => givenResponse);

      const expectedResult = [];

      const actualResult = await testUnit.productSearch(
        givenQuery,
        givenStoreAddressesMap,
        givenEnv
      );

      assert.deepStrictEqual(actualResult, expectedResult);
    });

    it('should return an empty array when there are no products', async (t) => {
      const givenQuery = 'query';
      const givenStoreAddressesMap = new Map();
      const givenResponse = { json: async () => ({}) };

      t.mock.method(global, 'fetch', async () => givenResponse);

      const expectedResult = [];

      const actualResult = await testUnit.productSearch(
        givenQuery,
        givenStoreAddressesMap,
        givenEnv
      );

      assert.deepStrictEqual(actualResult, expectedResult);
    });

    it('should call and return mapProducts() with the correct arguments', async (t) => {
      const givenQuery = 'query';
      const givenStoreAddressesMap = new Map();
      const givenProducts = ['product1', 'product2'];
      const givenResponse = { json: async () => ({ products: givenProducts }) };

      t.mock.method(global, 'fetch', async () => givenResponse);
      t.mock.method(testUnit, 'mapProducts', () => givenProducts);

      const expectedResult = givenProducts;

      const actualResult = await testUnit.productSearch(
        givenQuery,
        givenStoreAddressesMap,
        givenEnv
      );

      assert.deepStrictEqual(actualResult, expectedResult);
      assert.deepEqual(testUnit.mapProducts.mock.calls[0].arguments, [
        {
          products: givenProducts,
          storeAddressesMap: givenStoreAddressesMap,
          storeIds: givenSTORE_IDS,
        },
        givenEnv,
      ]);
    });

    it('should return an empty array when there is an error', async (t) => {
      const givenQuery = 'query';
      const givenStoreAddressesMap = new Map();
      const givenError = new Error('Some error');

      t.mock.method(global, 'fetch', async () => Promise.reject(givenError));
      t.mock.method(console, 'error');

      const expectedResult = [];

      const actualResult = await testUnit.productSearch(
        givenQuery,
        givenStoreAddressesMap,
        givenEnv
      );

      assert.deepStrictEqual(console.error.mock.calls[0].arguments, [
        givenError,
      ]);
      assert.deepStrictEqual(actualResult, expectedResult);
    });
  });

  describe('mapProducts()', () => {
    it('should map and get the productAvailability for each product', async (t) => {
      const givenProducts = [
        {
          dan: '1',
          gtin: 1,
          title: 'title1',
          imageUrlTemplates: ['{transformations}imageUrlTemplates1'],
          price: 'price1',
          relativeProductUrl: 'relativeProductUrl1',
        },
        {
          dan: '2',
          gtin: 2,
          title: 'title2',
          imageUrlTemplates: ['{transformations}imageUrlTemplates2'],
          price: 'price2',
          relativeProductUrl: 'relativeProductUrl2',
        },
      ];
      const givenStoreAddressesMap = new Map();
      const givenStoreIds = ['123', '456'];

      t.mock.method(testUnit, 'getProductAvailability', async () => []);

      const expectedResult = [
        {
          gtin: givenProducts[0].gtin.toString(),
          title: givenProducts[0].title,
          imageUrl: givenProducts[0].imageUrlTemplates[0].replace(
            '{transformations}',
            'f_auto,q_auto,c_fit,h_270,w_260'
          ),
          price: givenProducts[0].price,
          availableAt: [],
        },
        {
          gtin: givenProducts[1].gtin.toString(),
          title: givenProducts[1].title,
          imageUrl: givenProducts[1].imageUrlTemplates[0].replace(
            '{transformations}',
            'f_auto,q_auto,c_fit,h_270,w_260'
          ),
          price: givenProducts[1].price,
          availableAt: [],
        },
      ];

      const actualResult = await testUnit.mapProducts(
        {
          products: givenProducts,
          storeAddressesMap: givenStoreAddressesMap,
          storeIds: givenStoreIds,
        },
        {}
      );

      assert.deepStrictEqual(actualResult, expectedResult);
      assert.deepStrictEqual(
        testUnit.getProductAvailability.mock.calls[0].arguments,
        [
          {
            dan: givenProducts[0].dan,
            storeAddressesMap: givenStoreAddressesMap,
            storeIds: givenStoreIds,
            price: givenProducts[0].price,
            relativeProductUrl: givenProducts[0].relativeProductUrl,
          },
          {},
        ]
      );
      assert.deepEqual(
        testUnit.getProductAvailability.mock.calls[1].arguments,
        [
          {
            dan: givenProducts[1].dan,
            storeAddressesMap: givenStoreAddressesMap,
            storeIds: givenStoreIds,
            price: givenProducts[1].price,
            relativeProductUrl: givenProducts[1].relativeProductUrl,
          },
          {},
        ]
      );
    });
  });

  describe('getProductAvailability()', () => {
    const givenEnv = {
      DM_STORE_AVAILABILITY_API: 'someUrl',
    };

    it('should correctly call the availability api', async (t) => {
      const givenDan = '1';
      const givenStoreIds = ['123', '456'];

      t.mock.method(global, 'fetch', async () => ({
        json: async () => {},
      }));
      t.mock.method(testUnit, 'reduceAvailabilityResult', () => []);

      const expectedUrl = `${givenEnv.DM_STORE_AVAILABILITY_API}/store-availability/DE/products/dans/${givenDan}/availability-with-listing?storeNumbers=${givenStoreIds}&view=basic`;

      await testUnit.getProductAvailability(
        {
          dan: givenDan,
          storeIds: givenStoreIds,
        },
        givenEnv
      );

      assert.deepEqual(fetch.mock.calls[0].arguments, [expectedUrl]);
    });

    it('should request the availabilities return the reduced result', async (t) => {
      const givenDan = '1';
      const givenStoreAddressesMap = new Map();
      const givenStoreIds = ['123', '456'];
      const givenPrice = 'price';
      const givenRelativeProductUrl = 'relativeProductUrl';

      const givenAvailabilityResult = {};

      t.mock.method(global, 'fetch', async () => ({
        json: async () => givenAvailabilityResult,
      }));
      t.mock.method(testUnit, 'reduceAvailabilityResult', () => [
        'availabilityResult',
      ]);

      const expectedResult = ['availabilityResult'];

      const actualResult = await testUnit.getProductAvailability(
        {
          dan: givenDan,
          storeAddressesMap: givenStoreAddressesMap,
          storeIds: givenStoreIds,
          price: givenPrice,
          relativeProductUrl: givenRelativeProductUrl,
        },
        {}
      );

      assert.deepStrictEqual(actualResult, expectedResult);
    });

    it('should return an empty array when there is an error', async (t) => {
      const givenArgs = {};
      const givenError = new Error('Some error');

      t.mock.method(global, 'fetch', async () => Promise.reject(givenError));
      t.mock.method(console, 'error');

      const expectedResult = [];

      const actualResult = await testUnit.getProductAvailability(
        givenArgs,
        givenEnv
      );

      assert.deepStrictEqual(console.error.mock.calls[0].arguments, [
        givenError,
      ]);
      assert.deepStrictEqual(actualResult, expectedResult);
    });
  });

  describe('reduceAvailabilityResult()', () => {
    it('should return an empty array when there is no availabilityResult', () => {
      const givenAvailabilityResult = undefined;

      const expectedResult = [];

      const actualResult = testUnit.reduceAvailabilityResult({
        availabilityResult: givenAvailabilityResult,
      });

      assert.deepStrictEqual(actualResult, expectedResult);
    });

    it('should return an empty array when availabilityResult has no storeAvailability', () => {
      const givenAvailabilityResult = {};

      const expectedResult = [];

      const actualResult = testUnit.reduceAvailabilityResult({
        availabilityResult: givenAvailabilityResult,
      });

      assert.deepStrictEqual(actualResult, expectedResult);
    });

    it('should return an empty array when storeAvailability has no product in stock', () => {
      const givenAvailabilityResult = {
        storeAvailability: [
          {
            store: {
              storeNumber: '123',
            },
            inStock: false,
          },
        ],
      };

      const expectedResult = [];

      const actualResult = testUnit.reduceAvailabilityResult({
        availabilityResult: givenAvailabilityResult,
      });

      assert.deepStrictEqual(actualResult, expectedResult);
    });

    it('should update the storeAddressesMap with the store', () => {
      const givenAvailabilityResult = {
        storeAvailability: [
          {
            store: {
              storeNumber: '1000',
            },
            inStock: true,
          },
        ],
      };
      const givenStoreAddressesMap = new Map();
      const givenPrice = {};
      const givenRelativeProductUrl = {};

      const expectedResult = new Map([
        [
          'DM_1000',
          STORES[
            givenAvailabilityResult.storeAvailability[0].store.storeNumber
          ],
        ],
      ]);

      testUnit.reduceAvailabilityResult({
        availabilityResult: givenAvailabilityResult,
        storeAddressesMap: givenStoreAddressesMap,
        price: givenPrice,
        relativeProductUrl: givenRelativeProductUrl,
      });

      assert.deepStrictEqual(givenStoreAddressesMap, expectedResult);
    });

    it('should return an array with the correct availabilityResult', () => {
      const givenAvailabilityResult = {
        storeAvailability: [
          {
            store: {
              storeNumber: '1000',
            },
            inStock: true,
            stockLevel: 10,
          },
        ],
        relativeProductUrl: 'relativeProductUrl',
      };
      const givenStoreAddressesMap = new Map();
      const givenPrice = {
        formattedValue: 'formattedValue',
      };
      const givenRelativeProductUrl = '/relativeProductUrl';

      const expectedResult = [
        {
          type: 'Feature',
          properties: {
            storeId: `DM_${givenAvailabilityResult.storeAvailability[0].store.storeNumber}`,
            inStock: givenAvailabilityResult.storeAvailability[0].inStock,
            formattedPrice: givenPrice.formattedValue,
            stockLevel: givenAvailabilityResult.storeAvailability[0].stockLevel,
            url: `https://www.dm.de${givenRelativeProductUrl}`,
          },
          geometry: {
            type: 'Point',
            coordinates: [
              STORES[
                givenAvailabilityResult.storeAvailability[0].store.storeNumber
              ].location.lon,
              STORES[
                givenAvailabilityResult.storeAvailability[0].store.storeNumber
              ].location.lat,
            ],
          },
        },
      ];

      const actualResult = testUnit.reduceAvailabilityResult({
        availabilityResult: givenAvailabilityResult,
        storeAddressesMap: givenStoreAddressesMap,
        price: givenPrice,
        relativeProductUrl: givenRelativeProductUrl,
      });

      assert.deepStrictEqual(actualResult, expectedResult);
    });
  });
});
