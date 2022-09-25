'use strict';

require('dotenv').config();
const axios = require('axios');
const STORES = require('./data/optimizedStores.json');

const STORE_IDS = Object.keys(STORES);

module.exports = {
    /**
     *
     * @param products
     * @param storeAddressesMap
     * @param storeIds
     * @returns {Promise<Awaited<unknown>[]>}
     */
    async mapProducts({ products, storeAddressesMap, storeIds }) {
        const promises = products.map(async ({ dan, gtin, title, imageUrlTemplates, price }) => {

            const availableAt = await this.getProductAvailability({ dan, storeAddressesMap, storeIds, price});

            const imageUrl = imageUrlTemplates[0].replace('{transformations}', 'f_auto,q_auto,c_fit,h_270,w_260');

            return {
                gtin,
                title,
                imageUrl,
                price,
                availableAt,
            };
        });

        return Promise.all(promises);
    },

    /**
     * *
     * @param availabilityResult
     * @param storeAddressesMap
     * @param formattedPrice
     * @returns {*[]}
     */
    reduceAvailabilityResult({ availabilityResult, storeAddressesMap, price }) {
        if (!availabilityResult.data || !availabilityResult.data.storeAvailability) {
            return [];
        }

        return availabilityResult.data.storeAvailability.reduce((accumulator, { store, inStock, stockLevel }) => {
            if (!inStock) {
                return accumulator;
            }

            const { storeNumber } = store
            const uniqueStoreId = `DM_${storeNumber}`;
            if (!storeAddressesMap.has(uniqueStoreId)) {
                storeAddressesMap.set(uniqueStoreId, STORES[storeNumber]);
            }

            accumulator.push({
                inStock,
                storeId: uniqueStoreId,
                stockLevel,
                formattedPrice: price.formattedValue,
            });

            return accumulator;
        }, []);
    },

    /**
     *
     * @param dan
     * @param storeAddressesMap
     * @param storeIds
     * @param price
     * @returns {Promise<*[]>}
     */
    async getProductAvailability({ dan, storeAddressesMap, storeIds, price }) {
        try {
            const availabilityResult = await axios(
                `${process.env.DM_STORE_AVAILABILITY_API}store-availability/DE/products/dans/${dan}/availability-with-listing?storeNumbers=${storeIds}&view=basic`,
            );

            return this.reduceAvailabilityResult({ availabilityResult, storeAddressesMap, price });
        } catch (error) {
            console.error(error);
            return [];
        }
    },

    /**
     *
     * @param query
     * @param storeAddressesMap
     * @returns {Promise<*[]|Awaited<*>[]>}
     */
    async productSearch(query, storeAddressesMap) {
        try {
            const searchResult = await axios(
                `${process.env.DM_PRODUCT_SEARCH_API}/de/search?query=${encodeURI(query)}&searchType=product&type=search`
            );

            if (!searchResult.data || !searchResult.data.products ) {
                return [];
            }

            return this.mapProducts({
                products: searchResult.data.products,
                storeAddressesMap,
                storeIds: STORE_IDS,
            });
        } catch (error) {
            console.error(error);
            return []
        }
    },
};
