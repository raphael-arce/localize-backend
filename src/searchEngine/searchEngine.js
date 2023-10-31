import stores from './stores/stores.js';
import _ from 'lodash';

export default {
  async search(query, env) {
    if (query === '' || typeof query !== 'string') {
      return {
        products: [],
        storeAddresses: {},
      };
    }

    const storeAddressesMap = new Map();

    const productSearches = stores
      .getStores()
      .map((store) => store.productSearch(query, storeAddressesMap, env));

    const results = await Promise.all(productSearches);

    const products = this.mergeResults(results);

    const storeAddresses = Object.fromEntries(storeAddressesMap);

    return {
      products,
      storeAddresses,
    };
  },

  mergeResults(results) {
    const productMap = new Map();

    results.forEach((products) => this.mergeProducts(products, productMap));

    return Array.from(productMap.values());
  },

  mergeProducts(products, productMap) {
    products.forEach((product) => this.mergeProduct(product, productMap));
  },

  mergeProduct(product, productMap) {
    if (_.isEmpty(product.availableAt)) {
      return;
    }

    if (!productMap.has(product.gtin)) {
      productMap.set(product.gtin, this.getProductWithPriceComparison(product));
      return;
    }

    const existingProduct = productMap.get(product.gtin);

    existingProduct.availableAt.features.push(...product.availableAt);

    const updatedProduct = this.getUpdatedProductPriceRange(
      existingProduct,
      product
    );

    productMap.set(product.gtin, updatedProduct);
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
      availableAt: {
        type: 'FeatureCollection',
        features: availableAt,
      },
    };
  },

  getUpdatedProductPriceRange(existingProduct, productFromOtherStore) {
    if (this.hasSamePrice(productFromOtherStore, existingProduct)) {
      return existingProduct;
    }

    if (
      this.hasLowerPriceThanPriceRange(productFromOtherStore, existingProduct)
    ) {
      existingProduct.priceRange.min = productFromOtherStore.price.value;
      existingProduct.priceRange.formattedMin =
        productFromOtherStore.price.formattedValue;
      return existingProduct;
    }

    if (
      this.hasHigherPriceThanPriceRange(productFromOtherStore, existingProduct)
    ) {
      existingProduct.priceRange.max = productFromOtherStore.price.value;
      existingProduct.priceRange.formattedMax =
        productFromOtherStore.price.formattedValue;
      return existingProduct;
    }

    return existingProduct;
  },

  hasSamePrice(productFromOtherStore, existingProduct) {
    return (
      productFromOtherStore.price.value === existingProduct.priceRange.min &&
      productFromOtherStore.price.value === existingProduct.priceRange.max
    );
  },

  hasLowerPriceThanPriceRange(productFromOtherStore, existingProduct) {
    return productFromOtherStore.price.value < existingProduct.priceRange.min;
  },

  hasHigherPriceThanPriceRange(productFromOtherStore, existingProduct) {
    return productFromOtherStore.price.value > existingProduct.priceRange.max;
  },
};
