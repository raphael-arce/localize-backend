'use strict';

require('dotenv').config();
const axios = require('axios');
const _ = require('lodash');
const RELEVANT_POSTCODES = require('./data/reducedPostcodesWithShops.json');



module.exports = {
    reduceAvailabilityResult({ availabilityResult, storeAddressesMap, price}) {
        if (!availabilityResult.data || !availabilityResult.data.store) {
            return [];
        }

        return availabilityResult.data.store.reduce((accumulator, { id, productInfo , city, postcode, street }) => {
            const { available } = productInfo[0];

            if (!available || city !== 'Berlin') {
                return accumulator;
            }

            const uniqueStoreId = `ROSSMANN_${id}`
            if (!storeAddressesMap.has(uniqueStoreId)) {
                storeAddressesMap.set(uniqueStoreId, {
                    address: {
                        name: 'ROSSMANN Drogeriemarkt',
                        street,
                        zip: postcode,
                        city
                    }
                });
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

            const smallerImageUrl = `${normalimageurl}?width=310&height=140&fit=bounds`;

            return {
                gtin: code,
                title: name,
                imageUrl: smallerImageUrl,
                price,
                availableAt,
            };
        })

        return Promise.all(promises);
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