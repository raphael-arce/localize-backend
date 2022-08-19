// import * as STORES from '../data/optimizedStores.json';
const STORES = require('../data/optimizedStores.json');
// import axios from "axios";
const axios = require('axios');

const STORE_IDS = Object.keys(STORES);

async function productAvailability(products, storeIds) {

    const promises = products.map(async (product) => {
        const availabilityResult = await axios(
            `https://products.dm.de/store-availability/DE/products/dans/${product.dan}/availability-with-listing?storeNumbers=${storeIds}&view=basic`,
        );

        const availableAt = availabilityResult.data.storeAvailability.map((storeAvailability) => ({
            storeId: storeAvailability.store.storeNumber,
            inStock: storeAvailability.inStock,
            stockLevel: storeAvailability.stockLevel,
            locations: STORES[storeAvailability.store.storeNumber],
        }));
        return { ...product, availableAt: availableAt };
    });

    return Promise.all(promises);
}

async function productSearch(query) {
    const isValidQuery = (query !== null && query !== undefined && typeof query === 'string' && query !== '');
    if (isValidQuery) {
        const searchResult = await axios(
            `https://product-search.services.dmtech.com/de/search?query=${query}&searchType=product&type=search`
        );

        return productAvailability(searchResult.data.products, STORE_IDS);
    }

    return [];
}

module.exports = {
    productSearch
}
