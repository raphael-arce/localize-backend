'use strict';

jest.mock('axios');
jest.mock('./data/storesBerlin.json', () => ({
    '1': {
        'address': 'address1',
        'location': {
            'lat': 111,
            'lon': 333
        },
    },
    '2': {
        'address': 'address2',
        'location': {
            'lat': 222,
            'lon': 444
        },
    },
    '3': {
        'address': 'address3',
        'location': {
            'lat': 333,
            'lon': 555
        },
    },
}), { virtual: true });
const axios = require('axios');
const testUnit = require('./search');

describe('stores/ROSSMANN/search', () => {
    describe('reduceAvailabilityResult()', () => {
        it('should not update the given availabilityMap when availabilityResult has no data', () => {
            const givenAvailabilityMap = new Map();

            testUnit.reduceAvailabilityResult({
                availabilityResult: {},
                storeAddressesMap: new Map(),
                price: 'givenPrice',
                url: 'givenUrl'
            })

            expect(givenAvailabilityMap.size).toBe(0);
        })

        it('should not update the given availabilityMap availabilityResult.data has no store', () => {
            const givenAvailabilityMap = new Map();
            const givenAvailabilityResult = { data: {} };

            testUnit.reduceAvailabilityResult({
                availabilityResult: givenAvailabilityResult,
                storeAddressesMap: new Map(),
                price: 'givenPrice',
                url: 'givenUrl'
            })

            expect(givenAvailabilityMap.size).toBe(0);
        })

        it('should iterate over the available stores to and add the correctly formed products in stock or located in Berlin to the availabilityMap', async () => {
            const givenAvailabilityMap = new Map();
            const givenAvailabilityResult = {
                data: {
                    store: [
                        {
                            id: 1,
                            productInfo: [{ available : true}],
                            city: 'Berlin',
                        },
                        {
                            id: 1,
                            productInfo: [{ available : true}],
                            city: 'Berlin',
                        },
                        {
                            id: 2,
                            productInfo: [{ available : false}],
                            city: 'Berlin',
                        },
                        {
                            id: 3,
                            productInfo: [{ available : true}],
                            city: 'Brandenburg',
                        },
                    ],
                }
            }
            const givenPrice = {
                formattedValue: '123€',
            };
            const givenUrl = 'some/url';
            const givenStoreAddressesMap = new Map();
            const expectedReductedAvailabilityResult = new Map([
                [
                    'ROSSMANN_1',
                    {
                        type: 'Feature',
                        properties: {
                            storeId: 'ROSSMANN_1',
                            inStock: true,
                            formattedPrice: givenPrice.formattedValue,
                            url: `https://www.rossmann.de/de${givenUrl}`,
                        },
                        geometry: {
                            type: 'Point',
                            coordinates: [333, 111],
                        },
                    }
                ]
            ]);

            testUnit.reduceAvailabilityResult({
                availabilityMap: givenAvailabilityMap,
                availabilityResult: givenAvailabilityResult,
                storeAddressesMap: givenStoreAddressesMap,
                price: givenPrice,
                url: givenUrl,
            });

            expect(givenAvailabilityMap).toStrictEqual(expectedReductedAvailabilityResult);
        });

        it('should add the available stores\' address to the storeAddressesMap only when it has not been added yet', async () => {
            const givenAvailabilityMap = new Map();
            const givenAvailabilityResult = {
                data: {
                    store: [
                        {
                            id: 1,
                            productInfo: [{ available : true}],
                            city: 'Berlin',
                        },
                        {
                            id: 1,
                            productInfo: [{ available : true}],
                            city: 'Berlin',
                        },
                    ],
                }
            }
            const givenStoreAddressesMap = new Map();
            const expectedStoreAddressesMap = new Map().set('ROSSMANN_1', {
                'address': 'address1',
                'location': {
                    'lat': 111,
                    'lon': 333
                },
            });

            testUnit.reduceAvailabilityResult({
                availabilityMap: givenAvailabilityMap,
                availabilityResult: givenAvailabilityResult,
                storeAddressesMap: givenStoreAddressesMap,
                price: 'somePrice',
                url: '/someUrl'
            });

            expect(givenStoreAddressesMap).toStrictEqual(expectedStoreAddressesMap);
        });
    })

    describe('mapProducts()', () => {
        beforeEach(() => {
            jest.spyOn(testUnit, 'getProductAvailability').mockReturnValueOnce(['availability'])
        })

        afterEach(() => {
            testUnit.getProductAvailability.mockRestore();
        });

        it('should return a correctly formed product', async () => {
            const givenProducts = [{
                code: 987,
                dan: 123,
                name: 'productTitle',
                teaserimageurl: ['some/url'],
                price: {
                    formattedValue: '123€',
                    value: 123,
                }
            }]
            const givenStoreAddressesMap = new Map();
            const givenPostcodes = [1];

            const expectedProducts = [{
                gtin: 987,
                title: 'productTitle',
                imageUrl: 'some/url?width=310&height=140&fit=bounds',
                price: {
                    formattedValue: '123€',
                    value: 123,
                },
                availableAt: ['availability']
            }]

            const actualProducts = await testUnit.mapProducts({ products: givenProducts, storeAddressesMap: givenStoreAddressesMap, postcodes: givenPostcodes })

            expect(actualProducts).toStrictEqual(expectedProducts);
            expect(testUnit.getProductAvailability).toHaveBeenCalledTimes(1);
            expect(testUnit.getProductAvailability).toHaveBeenCalledWith({
                dan: 123,
                storeAddressesMap: givenStoreAddressesMap,
                postcodes: givenPostcodes,
                price: givenProducts[0].price
            });
        })

        it('should append the image format query params to the normal image url', async () => {
            const givenProducts = [{
                code: 987,
                dan: 123,
                name: 'productTitle',
                teaserimageurl: ['some/url'],
                price: {
                    formattedValue: '123€',
                    value: 123,
                }
            }]
            const givenStoreAddressesMap = new Map();
            const givenPostcodes = [1];

            const expectedProducts = [{
                gtin: 987,
                title: 'productTitle',
                imageUrl: 'some/url?width=310&height=140&fit=bounds',
                price: {
                    formattedValue: '123€',
                    value: 123,
                },
                availableAt: ['availability']
            }]

            const actualProducts = await testUnit.mapProducts({
                products: givenProducts,
                storeAddressesMap: givenStoreAddressesMap,
                postcodes: givenPostcodes
            })

            expect(actualProducts).toStrictEqual(expectedProducts);
        });
    });

    describe('getProductAvailability()', () => {
        beforeEach(() => {
            jest.spyOn(testUnit, 'reduceAvailabilityResult');
        })

        afterEach(() => {
            testUnit.reduceAvailabilityResult.mockReset();
            axios.mockReset();
        });

        it('should call axios with correctly form url and return (and call) reduceAvailabilityResult()', async () => {
            const givenDan = 123;
            const givenStoreAddressesMap = new Map();
            jest.spyOn(givenStoreAddressesMap, 'values');
            const givenPostcodes = [1]
            axios.mockResolvedValueOnce({});
            testUnit.reduceAvailabilityResult.mockResolvedValueOnce({})

            const actualProductAvailability = await testUnit.getProductAvailability({
                dan: givenDan,
                storeAddressesMap: givenStoreAddressesMap,
                postcodes: givenPostcodes,
                price: 'somePrice',
                url: 'someUrl',
            });

            expect(actualProductAvailability).toStrictEqual([]);
            expect(axios).toHaveBeenCalledTimes(1)
            expect(axios).toHaveBeenCalledWith(
                `${process.env.ROSSMANN_STORE_AVAILABILITY_API}/storefinder/.rest/store?dan=${givenDan}&q=${givenPostcodes[0]}`
            );
            expect(testUnit.reduceAvailabilityResult).toHaveBeenCalledTimes(1);
            expect(testUnit.reduceAvailabilityResult).toHaveBeenCalledWith({
                availabilityMap: givenStoreAddressesMap,
                availabilityResult: {},
                storeAddressesMap: givenStoreAddressesMap,
                price: 'somePrice',
                url: 'someUrl'
            });
            expect(givenStoreAddressesMap.values).toHaveBeenCalledTimes(0);
        });

        it('should return an empty array when an error occurs', async () => {
            const givenDan = 123;
            const givenStoreAddressesMap = new Map();
            const givenError = new Error('some error');
            axios.mockRejectedValueOnce(givenError);
            jest.spyOn(global.console, 'error').mockImplementationOnce(() => {});

            const actualProductAvailability = await testUnit.getProductAvailability({
                dan: givenDan,
                storeAddressesMap: givenStoreAddressesMap,
                postcodes: [1]
            });

            expect(actualProductAvailability).toStrictEqual([]);
            expect(axios).toHaveBeenCalledTimes(1);
            expect(testUnit.reduceAvailabilityResult).toHaveBeenCalledTimes(0);
            expect(global.console.error).toHaveBeenCalledTimes(1);
            expect(global.console.error).toHaveBeenCalledWith(givenError);

            global.console.error.mockRestore();
        })
    });

    describe('productSearch()', () => {
        const givenStoreAddressesMap = new Map();

        beforeEach(() => {
            jest.spyOn(testUnit, 'mapProducts');
        })

        afterEach(() => {
            testUnit.mapProducts.mockReset();
            axios.mockReset();
        });

        it('should make an axios call with encoded query', async() => {
            const givenQuery = 'käse';
            axios.mockResolvedValueOnce({});
            const expectedResult = `${process.env.ROSSMANN_PRODUCT_SEARCH_API}/de/search/suggest?q=${encodeURI(givenQuery)}`;

            await testUnit.productSearch(givenQuery, givenStoreAddressesMap);

            expect(axios).toHaveBeenCalledTimes(1);
            expect(axios).toHaveBeenCalledWith(expectedResult);
        })

        it('should return an empty array if searchResult has no data', async () => {
            const givenQuery = 'query';
            axios.mockResolvedValueOnce({});

            const actualResult = await testUnit.productSearch(givenQuery, givenStoreAddressesMap);

            expect(actualResult).toStrictEqual([]);
        });

        it('should return an empty array if searchResult.data has no products', async () => {
            const givenQuery = 'query';
            axios.mockResolvedValueOnce({ data: {}});

            const actualResult = await testUnit.productSearch(givenQuery, givenStoreAddressesMap);

            expect(actualResult).toStrictEqual([]);
        });

        it('should return an empty array if searchResult.data.products has no results', async () => {
            const givenQuery = 'query';
            axios.mockResolvedValueOnce({ data: { products: {}}});

            const actualResult = await testUnit.productSearch(givenQuery, givenStoreAddressesMap);

            expect(actualResult).toStrictEqual([]);
        });

        it('should call and return mapProducts() with the found products', async () => {
            const givenQuery = 'query';
            axios.mockResolvedValueOnce({ data: { products: { results: {} }}});
            const expectedResult = ['product1'];
            testUnit.mapProducts.mockReturnValueOnce(expectedResult);

            const actualResult = await testUnit.productSearch(givenQuery, givenStoreAddressesMap);

            expect(actualResult).toStrictEqual(expectedResult);
        });

        it('should call console.error and return a correctly formed object', async () => {
            const givenQuery = 'query';
            const givenError = new Error('some error');
            axios.mockRejectedValueOnce(givenError);
            jest.spyOn(global.console, 'error').mockImplementationOnce(() => {});

            const expectedResult = []

            const actualResult = await testUnit.productSearch(givenQuery, givenStoreAddressesMap);

            expect(actualResult).toStrictEqual(expectedResult);
            expect(testUnit.mapProducts).toHaveBeenCalledTimes(0);
            expect(global.console.error).toHaveBeenCalledTimes(1);
            expect(global.console.error).toHaveBeenCalledWith(givenError);

            global.console.error.mockRestore();
        });

    })
});
