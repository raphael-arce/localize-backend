'use strict';

require('dotenv').config();
const axios = require('axios');
const _ = require('lodash');
const RELEVANT_POSTCODES = require('./data/reducedPostcodesWithShops.json');
const STORES = require('./data/storesBerlin.json');

module.exports = {
    reduceAvailabilityResult({ availabilityResult, storeAddressesMap, price}) {
        if (!availabilityResult.data || !availabilityResult.data.store) {
            return [];
        }

        return availabilityResult.data.store.reduce((accumulator, { id, productInfo , city }) => {
            const { available } = productInfo[0];
            const uniqueStoreId = `ROSSMANN_${id}`

            if (!available
                || city !== 'Berlin'
                || accumulator.some(availability => availability.storeId ===  uniqueStoreId)) {
                return accumulator;
            }

            if (!storeAddressesMap.has(uniqueStoreId)) {
                storeAddressesMap.set(uniqueStoreId, STORES[id]);
            }

            accumulator.push({
                storeId: uniqueStoreId,
                inStock: available,
                formattedPrice: price.formattedValue,
            });

            return accumulator;
        }, []);
    },

    async getProductAvailability({ dan, postcodes, storeAddressesMap, price }) {
        const availabilityPromises = postcodes.map(async (postcode) => {
            try {
                const availabilityResult = await axios(
                    `${process.env.ROSSMANN_STORE_AVAILABILITY_API}/storefinder/.rest/store?dan=${dan}&q=${postcode}`
                );

                return this.reduceAvailabilityResult({
                    availabilityResult,
                    storeAddressesMap,
                    price
                })
            } catch (error) {
                console.error(error);
                return [];
            }

        });

        const availableAtUnflattened = await Promise.all(availabilityPromises);
        const availableAt = _.compact(_.flattenDeep(availableAtUnflattened));

        return availableAt;
    },

    async mapProducts({ products, storeAddressesMap, postcodes }) {
        const promises = products.map(async ({code, dan, name, normalimageurl, price}) => {

            const availableAt = await this.getProductAvailability({
                dan,
                postcodes,
                storeAddressesMap,
                price
            })

            if (_.isEmpty(availableAt)) {
                return undefined;
            }

            const smallerImageUrl = `${normalimageurl}?width=310&height=140&fit=bounds`;

            return {
                gtin: code,
                title: name,
                imageUrl: smallerImageUrl,
                price,
                availableAt,
            };
        })

        const mappedProducts = await Promise.all(promises);
        return _.compact(mappedProducts);
    },

    async productSearch(query, storeAddressesMap) {
        try {
            const searchResult = await axios(
                `${process.env.ROSSMANN_PRODUCT_SEARCH_API}/de/search/suggest?q=${encodeURI(query)}`
            )

            if (!searchResult.data || !searchResult.data.products || !searchResult.data.products.results) {
                return [];
            }

            return this.mapProducts({
                products: searchResult.data.products.results,
                storeAddressesMap,
                postcodes: RELEVANT_POSTCODES
            })
        } catch (error) {
            console.error(error);
            return [];
        }
    }
}