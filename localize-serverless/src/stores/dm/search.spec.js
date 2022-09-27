'use strict';

jest.mock('axios');
jest.mock('./data/storesBerlin.json', () => ({
    '1': 'address1',
    '2': 'address2',
    '3': 'address3',
}), { virtual: true });
const axios = require('axios');
const testUnit = require('./search');

describe('stores/DM/search', () => {
    describe('mapProducts()', () => {
        beforeEach(() => {
            jest.spyOn(testUnit, 'getProductAvailability').mockReturnValueOnce(['availability']);
        })

        afterEach(() => {
            testUnit.getProductAvailability.mockRestore();
        });

        it('should return a correctly formed product', async () => {
            const givenProducts = [{
                gtin: 987,
                dan: 123,
                title: 'productTitle',
                imageUrlTemplates: ['some/url'],
                price: {
                    formattedValue: '123€',
                    value: 123,
                }
            }]
            const givenStoreAddressesMap = new Map();
            const givenStoreIds = [1];

            const expectedProducts = [{
                gtin: '987',
                title: 'productTitle',
                imageUrl: 'some/url',
                price: {
                    formattedValue: '123€',
                    value: 123,
                },
                availableAt: ['availability']
            }]

            const actualProducts = await testUnit.mapProducts({ products: givenProducts, storeAddressesMap: givenStoreAddressesMap, storeIds: givenStoreIds })

            expect(actualProducts).toStrictEqual(expectedProducts);
            expect(testUnit.getProductAvailability).toHaveBeenCalledTimes(1);
            expect(testUnit.getProductAvailability).toHaveBeenCalledWith({
                dan: 123,
                storeAddressesMap: givenStoreAddressesMap,
                storeIds: givenStoreIds,
                price: givenProducts[0].price
            });
        })

        it('should replace {transformations} in the imageUrlTemplate\'s first item', async () => {
            const givenProducts = [{
                gtin: 987,
                dan: 123,
                title: 'productTitle',
                imageUrlTemplates: ['some/url/{transformations}'],
                price: {
                    formattedValue: '123€',
                    value: 123,
                }
            }]
            const givenStoreAddressesMap = new Map();
            const givenStoreIds = [1];

            const expectedProducts = [{
                gtin: '987',
                title: 'productTitle',
                imageUrl: 'some/url/f_auto,q_auto,c_fit,h_270,w_260',
                price: {
                    formattedValue: '123€',
                    value: 123,
                },
                availableAt: ['availability']
            }]

            const actualProducts = await testUnit.mapProducts({
                products: givenProducts,
                storeAddressesMap: givenStoreAddressesMap,
                storeIds: givenStoreIds
            })

            expect(actualProducts).toStrictEqual(expectedProducts);
        });
    });

    describe('reduceAvailabilityResult()', () => {
        it('should return an empty string if there availabilityResult.data is undefined', async () => {
            const givenAvailabilityResult = {}
            const givenStoreAddressesMap = new Map();
            const givenPrice = 'somePrice';

            const actualReducedAvailabilityResult = testUnit.reduceAvailabilityResult({
                availabilityResult: givenAvailabilityResult,
                storeAddressesMap: givenStoreAddressesMap,
                price: givenPrice,
            });

            expect(actualReducedAvailabilityResult).toStrictEqual([]);
        });

        it('should return an empty string if there availabilityResult.data.storeAvailability is undefined', async () => {
            const givenAvailabilityResult = {data: {}}
            const givenStoreAddressesMap = new Map();
            const givenPrice = 'somePrice';

            const actualReducedAvailabilityResult = testUnit.reduceAvailabilityResult({
                availabilityResult: givenAvailabilityResult,
                storeAddressesMap: givenStoreAddressesMap,
                price: givenPrice,
            });

            expect(actualReducedAvailabilityResult).toStrictEqual([]);
        });

        it('should reduce the available stores to where the product is in stock', async () => {
            const givenAvailabilityResult = {
                data: {
                    storeAvailability: [
                        {
                            store: {
                                storeNumber: 1
                            },
                            inStock: true,
                            stockLevel: 12
                        },
                        {
                            store: {
                                storeNumber: 2
                            },
                            inStock: false,
                            stockLevel: 0
                        }
                    ]
                }
            }
            const givenPrice = {
                formattedValue: '123€',
            };
            const givenStoreAddressesMap = new Map();
            const expectedReductedAvailabilityResult = {
                storeId: 'DM_1',
                inStock: true,
                stockLevel: 12,
                formattedPrice: givenPrice.formattedValue,
            }

            const actualReducedAvailabilityResult = testUnit.reduceAvailabilityResult({
                availabilityResult: givenAvailabilityResult,
                storeAddressesMap: givenStoreAddressesMap,
                price: givenPrice
            });

            expect(actualReducedAvailabilityResult).toStrictEqual([expectedReductedAvailabilityResult]);
        })

        it('should add the available stores\' address to the storeAddressesMap only when it has not been added yet', async () => {
            const givenAvailabilityResult = {
                data: {
                    storeAvailability: [
                        {
                            store: {
                                storeNumber: 1
                            },
                            inStock: true,
                            stockLevel: 12
                        },
                        {
                            store: {
                                storeNumber: 1
                            },
                            inStock: true,
                            stockLevel: 32
                        }
                    ]
                }
            }
            const givenStoreAddressesMap = new Map();
            const expectedStoreAddressesMap = new Map().set('DM_1', 'address1')

            testUnit.reduceAvailabilityResult({
                availabilityResult: givenAvailabilityResult,
                storeAddressesMap: givenStoreAddressesMap,
                price: 'somePrice',
            });

            expect(givenStoreAddressesMap).toStrictEqual(expectedStoreAddressesMap);
        })
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
            const givenStoreIds = [1]
            const expectedProductAvailability = ['someAvailability'];
            axios.mockResolvedValueOnce(expectedProductAvailability);
            testUnit.reduceAvailabilityResult.mockReturnValueOnce(expectedProductAvailability);

            const actualProductAvailability = await testUnit.getProductAvailability({
                dan: givenDan,
                storeAddressesMap: givenStoreAddressesMap,
                storeIds: givenStoreIds,
                price: 'somePrice',
            });

            expect(actualProductAvailability).toBe(expectedProductAvailability);
            expect(axios).toHaveBeenCalledTimes(1)
            expect(axios).toHaveBeenCalledWith(
                `${process.env.DM_STORE_AVAILABILITY_API}store-availability/DE/products/dans/${givenDan}/availability-with-listing?storeNumbers=${givenStoreIds}&view=basic`
            );
            expect(testUnit.reduceAvailabilityResult).toHaveBeenCalledTimes(1);
            expect(testUnit.reduceAvailabilityResult).toHaveBeenCalledWith({
                availabilityResult: expectedProductAvailability,
                storeAddressesMap: givenStoreAddressesMap,
                price: 'somePrice'
            });
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
                storeIds: [1]
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
            const expectedResult = `${process.env.DM_PRODUCT_SEARCH_API}/de/search?query=${encodeURI(givenQuery)}&searchType=product&type=search`;

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
            axios.mockResolvedValueOnce({data: {}});

            const actualResult = await testUnit.productSearch(givenQuery, givenStoreAddressesMap);

            expect(actualResult).toStrictEqual([]);
        });

        it('should call and return mapProducts() with the found products', async () => {
            const givenQuery = 'query';
            axios.mockResolvedValueOnce({ data: { products: [] }});
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
    });
});