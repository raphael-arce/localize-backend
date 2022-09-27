const dm = require("../stores/dm/search");
const rossmann = require("../stores/ROSSMANN/search");
const _ = require("lodash");

module.exports = {
    returnValueOfMapEntry([key, value]){
        return value
    },

    getProductWithPriceComparison({ gtin, title, imageUrl, price, availableAt }) {
        const { formattedValue, value } = price;

        return {
            gtin,
            title,
            imageUrl,
            priceRange: {
                min: value,
                formattedMin: formattedValue,
                max: value,
                formattedMax: formattedValue,
            },
            availableAt
        }
    },

    mergeProducts(products, productMap) {
        products.forEach(product => {
            if (!productMap.has(product.gtin)) {
                productMap.set(product.gtin, this.getProductWithPriceComparison(product));
                return;
            }

            if (_.isEmpty(product.availableAt)) {
                return;
            }

            const existingProduct = productMap.get(product.gtin);

            if (product.price.value < existingProduct.priceRange.min) {
                existingProduct.priceRange.min = product.price.value;
                existingProduct.priceRange.formattedMin = product.price.formattedValue;
            } else if (product.price.value > existingProduct.priceRange.max) {
                existingProduct.priceRange.max = product.price.value;
                existingProduct.priceRange.formattedMax = product.price.formattedValue;
            }

            existingProduct.availableAt.push(...product.availableAt);
        });
    },

    mergeResults(results) {
        const productMap = new Map();

        results.forEach(products => {
            this.mergeProducts(products, productMap);
        });

        return Array.from(productMap, this.returnValueOfMapEntry);
    },

    /**
     * *
     * @param { string } query
     * @returns {Promise<{storeAddresses: (*), products: *}>}
     */
    async search(query) {

        if (query === '' || typeof query !== 'string') {
            return {
                products: [],
                storeAddresses: {}
            }
        }

        const productSearches = [];

        const storeAddressesMap = new Map();

        productSearches.push(rossmann.productSearch(query, storeAddressesMap));
        productSearches.push(dm.productSearch(query, storeAddressesMap));

        const results = await Promise.all(productSearches);

        const products = this.mergeResults(results);

        return {
            products,
            storeAddresses: Object.fromEntries(storeAddressesMap)
        };
    }
}