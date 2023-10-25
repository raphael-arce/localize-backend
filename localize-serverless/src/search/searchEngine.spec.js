const testUnit = require('./searchEngine.js');
jest.mock('../stores/dm/search');
const dmSearch = require('../stores/dm/search.js');
jest.mock('../stores/ROSSMANN/search');
const rossmannSearch = require('../stores/ROSSMANN/search.js');

describe('search/searchEngine', () => {
  describe('search()', () => {
    it('should return early with empty products and storeAddresses if the query is empty', async () => {
      const givenQuery = '';
      jest.spyOn(global.Promise, 'all');
      jest.spyOn(testUnit, 'mergeResults');

      const expectedResult = {
        products: [],
        storeAddresses: {},
      };

      const actualResult = await testUnit.search(givenQuery);

      expect(actualResult).toStrictEqual(expectedResult);
      expect(dmSearch.productSearch).toHaveBeenCalledTimes(0);
      expect(rossmannSearch.productSearch).toHaveBeenCalledTimes(0);
      expect(global.Promise.all).toHaveBeenCalledTimes(0);
      expect(testUnit.mergeResults).toHaveBeenCalledTimes(0);
    });

    it('should call dmSearch.productSearch(), rossmann.productSearch(), Promise.all(), reduceProducts() and return a correctly formed object', async () => {
      const givenQuery = 'query';
      const givenProducts = ['product1'];
      dmSearch.productSearch.mockResolvedValueOnce(givenProducts);
      rossmannSearch.productSearch.mockResolvedValueOnce(givenProducts);
      jest.spyOn(global.Promise, 'all');
      jest
        .spyOn(testUnit, 'mergeResults')
        .mockImplementationOnce((results) => results[0]);

      const expectedResult = {
        products: givenProducts,
        storeAddresses: {},
      };

      const actualResult = await testUnit.search(givenQuery);

      expect(actualResult).toStrictEqual(expectedResult);
      expect(dmSearch.productSearch).toHaveBeenCalledTimes(1);
      expect(dmSearch.productSearch).toHaveBeenCalledWith(
        givenQuery,
        new Map()
      );
      expect(rossmannSearch.productSearch).toHaveBeenCalledTimes(1);
      expect(rossmannSearch.productSearch).toHaveBeenCalledWith(
        givenQuery,
        new Map()
      );
      expect(global.Promise.all).toHaveBeenCalledTimes(1);
      expect(global.Promise.all).toHaveBeenCalledWith([
        new Promise((resolve) => resolve(givenProducts)),
        new Promise((resolve) => resolve(givenProducts)),
      ]);
      expect(testUnit.mergeResults).toHaveBeenCalledTimes(1);
      expect(testUnit.mergeResults).toHaveBeenCalledWith([
        givenProducts,
        givenProducts,
      ]);
    });
  });

  describe('mergeResults()', () => {
    it('should call mergeProducts for each result', async () => {
      const givenResults = [['product1'], ['product2']];
      const givenProductMap = new Map();
      jest.spyOn(testUnit, 'mergeProducts').mockImplementation(() => {});
      jest.spyOn(global.Array, 'from');

      const expectedResult = [];

      const actualResult = testUnit.mergeResults(givenResults);

      expect(actualResult).toStrictEqual(expectedResult);
      expect(testUnit.mergeProducts).toHaveBeenCalledTimes(2);
      expect(testUnit.mergeProducts).toHaveBeenNthCalledWith(
        1,
        ['product1'],
        givenProductMap
      );
      expect(testUnit.mergeProducts).toHaveBeenNthCalledWith(
        2,
        ['product2'],
        givenProductMap
      );
      expect(global.Array.from).toHaveBeenCalledTimes(1);
      expect(global.Array.from).toHaveBeenCalledWith(
        givenProductMap,
        testUnit.returnValueOfMapEntry
      );

      testUnit.mergeProducts.mockRestore();
    });
  });

  describe('mergeProducts()', () => {
    beforeEach(() => {
      jest.spyOn(testUnit, 'getProductWithPriceComparison');
    });

    afterEach(() => {
      testUnit.getProductWithPriceComparison.mockRestore();
    });

    it('should not add the product to the productMap if there is no availability', async () => {
      const givenProduct1 = {
        gtin: 1,
        price: {
          value: 2,
          formattedValue: '2€',
        },
        availableAt: [],
      };
      const givenProduct2 = {
        gtin: 1,
        price: {
          value: 10,
          formattedValue: '10€',
        },
        availableAt: [],
      };

      const givenProducts = [givenProduct1, givenProduct2];
      const givenProductMap = new Map();

      const expectedProductMap = new Map();

      testUnit.mergeProducts(givenProducts, givenProductMap);

      expect(givenProductMap).toStrictEqual(expectedProductMap);
      expect(testUnit.getProductWithPriceComparison).toHaveBeenCalledTimes(0);
    });

    it('should not update the priceRange and not add the availabilities if there is no availability', async () => {
      const givenProduct1 = {
        gtin: 1,
        price: {
          value: 2,
          formattedValue: '2€',
        },
        availableAt: ['store_1'],
      };
      const givenProduct2 = {
        gtin: 1,
        price: {
          value: 10,
          formattedValue: '10€',
        },
        availableAt: [],
      };

      const givenProducts = [givenProduct1, givenProduct2];
      const givenProductMap = new Map();

      const expectedProductMap = new Map().set(1, {
        gtin: 1,
        priceRange: {
          min: 2,
          formattedMin: '2€',
          max: 2,
          formattedMax: '2€',
        },
        availableAt: {
          type: 'FeatureCollection',
          features: ['store_1'],
        },
      });

      testUnit.mergeProducts(givenProducts, givenProductMap);

      expect(givenProductMap).toStrictEqual(expectedProductMap);
      expect(testUnit.getProductWithPriceComparison).toHaveBeenCalledTimes(1);
      expect(testUnit.getProductWithPriceComparison).toHaveBeenNthCalledWith(
        1,
        givenProduct1
      );
    });

    it('should save a productWithPriceComparison in the given productMap if it does not exist', async () => {
      const givenProduct1 = {
        gtin: 1,
        price: {
          value: 1,
          formattedValue: '1€',
        },
        availableAt: ['store_1'],
      };
      const givenProducts = [givenProduct1];
      const givenProductMap = new Map();

      const expectedProductMap = new Map().set(1, {
        gtin: 1,
        priceRange: {
          min: 1,
          formattedMin: '1€',
          max: 1,
          formattedMax: '1€',
        },
        availableAt: {
          type: 'FeatureCollection',
          features: ['store_1'],
        },
      });

      testUnit.mergeProducts(givenProducts, givenProductMap);

      expect(givenProductMap).toStrictEqual(expectedProductMap);
      expect(testUnit.getProductWithPriceComparison).toHaveBeenCalledTimes(1);
      expect(testUnit.getProductWithPriceComparison).toHaveBeenCalledWith(
        givenProduct1
      );
    });

    it('should update the priceRange.min and priceRange.formattedMin correctly', async () => {
      const givenProduct1 = {
        gtin: 1,
        price: {
          value: 2,
          formattedValue: '2€',
        },
        availableAt: ['store_1'],
      };
      const givenProduct2 = {
        gtin: 1,
        price: {
          value: 1,
          formattedValue: '1€',
        },
        availableAt: ['store_2'],
      };

      const givenProducts = [givenProduct1, givenProduct2];
      const givenProductMap = new Map();

      const expectedProductMap = new Map().set(1, {
        gtin: 1,
        priceRange: {
          min: 1,
          formattedMin: '1€',
          max: 2,
          formattedMax: '2€',
        },
        availableAt: {
          type: 'FeatureCollection',
          features: ['store_1', 'store_2'],
        },
      });

      testUnit.mergeProducts(givenProducts, givenProductMap);

      expect(givenProductMap).toStrictEqual(expectedProductMap);
      expect(testUnit.getProductWithPriceComparison).toHaveBeenCalledTimes(1);
      expect(testUnit.getProductWithPriceComparison).toHaveBeenNthCalledWith(
        1,
        givenProduct1
      );
    });

    it('should update the priceRange.max and priceRange.formattedMax correctly', async () => {
      const givenProduct1 = {
        gtin: 1,
        price: {
          value: 2,
          formattedValue: '2€',
        },
        availableAt: ['store_1'],
      };
      const givenProduct2 = {
        gtin: 1,
        price: {
          value: 3,
          formattedValue: '3€',
        },
        availableAt: ['store_2'],
      };

      const givenProducts = [givenProduct1, givenProduct2];
      const givenProductMap = new Map();

      const expectedProductMap = new Map().set(1, {
        gtin: 1,
        priceRange: {
          min: 2,
          formattedMin: '2€',
          max: 3,
          formattedMax: '3€',
        },
        availableAt: {
          type: 'FeatureCollection',
          features: ['store_1', 'store_2'],
        },
      });

      testUnit.mergeProducts(givenProducts, givenProductMap);

      expect(givenProductMap).toStrictEqual(expectedProductMap);
      expect(testUnit.getProductWithPriceComparison).toHaveBeenCalledTimes(1);
      expect(testUnit.getProductWithPriceComparison).toHaveBeenNthCalledWith(
        1,
        givenProduct1
      );
    });

    it('should not update the priceRange if the prices are the same', async () => {
      const givenProduct1 = {
        gtin: 1,
        price: {
          value: 2,
          formattedValue: '2€',
        },
        availableAt: ['store_1'],
      };
      const givenProduct2 = {
        gtin: 1,
        price: {
          value: 2,
          formattedValue: '2€',
        },
        availableAt: ['store_2'],
      };

      const givenProducts = [givenProduct1, givenProduct2];
      const givenProductMap = new Map();

      const expectedProductMap = new Map().set(1, {
        gtin: 1,
        priceRange: {
          min: 2,
          formattedMin: '2€',
          max: 2,
          formattedMax: '2€',
        },
        availableAt: {
          type: 'FeatureCollection',
          features: ['store_1', 'store_2'],
        },
      });

      testUnit.mergeProducts(givenProducts, givenProductMap);

      expect(givenProductMap).toStrictEqual(expectedProductMap);
      expect(testUnit.getProductWithPriceComparison).toHaveBeenCalledTimes(1);
      expect(testUnit.getProductWithPriceComparison).toHaveBeenNthCalledWith(
        1,
        givenProduct1
      );
    });
  });

  describe('getProductWithPriceComparison()', () => {
    it('should return a correctly formed object', () => {
      const givenProduct = {
        gtin: 1,
        title: 'someTitle',
        imageUrl: 'someImageUrl',
        price: {
          formattedValue: 'formattedPriceValue',
          value: 'priceValue',
        },
        availableAt: ['availabilities'],
      };

      const expectedProduct = {
        gtin: 1,
        title: 'someTitle',
        imageUrl: 'someImageUrl',
        priceRange: {
          min: 'priceValue',
          formattedMin: 'formattedPriceValue',
          max: 'priceValue',
          formattedMax: 'formattedPriceValue',
        },
        availableAt: {
          type: 'FeatureCollection',
          features: ['availabilities'],
        },
      };

      const actualProductWithPriceComparison =
        testUnit.getProductWithPriceComparison(givenProduct);

      expect(actualProductWithPriceComparison).toStrictEqual(expectedProduct);
    });
  });

  describe('returnValueOfMapEntry()', () => {
    it('should return the value of given mapEntry', () => {
      const givenMapEntry = ['key', 'value'];

      const expectedValue = 'value';

      const actualValue = testUnit.returnValueOfMapEntry(givenMapEntry);

      expect(actualValue).toStrictEqual(expectedValue);
    });
  });
});
