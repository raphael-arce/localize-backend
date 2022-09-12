// import * as STORES from '../data/optimizedStores.json';
const STORES = require('../data/optimizedStores.json');
// import axios from "axios";
const axios = require('axios');

const STORE_IDS = Object.keys(STORES);

async function productAvailability(products, storeIds) {

    const storesWhereAvailable = []
    const promises = products.map(async ({dan, title, imageUrlTemplates, price}) => {
        const availabilityResult = await axios(
            `https://products.dm.de/store-availability/DE/products/dans/${dan}/availability-with-listing?storeNumbers=${storeIds}&view=basic`,
        );

        const availableAt = availabilityResult.data.storeAvailability.map(({ store, inStock, stockLevel }) => {

            const { storeNumber } = store

            if (!storesWhereAvailable.includes(storeNumber)) {
                storesWhereAvailable.push(storeNumber);
            }

            return {
                storeId: storeNumber,
                inStock,
                stockLevel,
            }
        });

        const { formattedValue } = price;

        return {
            title,
            imageUrlTemplates,
            price: formattedValue,
            availableAt,
        };
    });

    const productsWithAvailability = await Promise.all(promises);

    const storeAddresses = {}
    for (const key of storesWhereAvailable) {
        storeAddresses[key] = STORES[key];
    }

    return {
        products: productsWithAvailability,
        storeAddresses
    }
}

async function productSearch(query) {
    const isValidQuery = (query !== null && query !== undefined && typeof query === 'string' && query !== '');
    if (isValidQuery) {
        const searchResult = await axios(
            `https://product-search.services.dmtech.com/de/search?query=${encodeURI(query)}&searchType=product&type=search`
        );

        return productAvailability(searchResult.data.products, STORE_IDS);
    }

    return [];
}

module.exports = {
    productSearch
}
