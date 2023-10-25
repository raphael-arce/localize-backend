'use strict';

require('dotenv').config();
const axios = require('axios');
const RELEVANT_POSTCODES = require('./data/reducedPostcodesWithShops.json');
const STORES = require('./data/storesBerlin.json');

module.exports = {
  reduceAvailabilityResult({
    availabilityMap,
    availabilityResult,
    storeAddressesMap,
    price,
    url,
  }) {
    if (!availabilityResult.data || !availabilityResult.data.store) {
      return;
    }

    availabilityResult.data.store.forEach(({ id, productInfo, city }) => {
      const { available } = productInfo[0];
      const uniqueStoreId = `ROSSMANN_${id}`;

      if (
        !available ||
        city !== 'Berlin' ||
        availabilityMap.has(uniqueStoreId)
      ) {
        return;
      }

      storeAddressesMap.set(uniqueStoreId, STORES[id]);

      const { lat, lon } = STORES[id].location;

      availabilityMap.set(uniqueStoreId, {
        type: 'Feature',
        properties: {
          storeId: uniqueStoreId,
          inStock: available,
          formattedPrice: price.formattedValue,
          url: `https://www.rossmann.de/de${url}`,
        },
        geometry: {
          type: 'Point',
          coordinates: [lon, lat],
        },
      });
    });
  },

  async getProductAvailability({
    dan,
    postcodes,
    storeAddressesMap,
    price,
    url,
  }) {
    const availabilityMap = new Map();
    const availabilityPromises = postcodes.map(async (postcode) => {
      try {
        const availabilityResult = await axios(
          `${process.env.ROSSMANN_STORE_AVAILABILITY_API}/storefinder/.rest/store?dan=${dan}&q=${postcode}`
        );

        return this.reduceAvailabilityResult({
          availabilityMap,
          availabilityResult,
          storeAddressesMap,
          price,
          url,
        });
      } catch (error) {
        console.error(error);
        return [];
      }
    });

    await Promise.all(availabilityPromises);

    return Array.from(availabilityMap.values());
  },

  async mapProducts({ products, storeAddressesMap, postcodes }) {
    const promises = products.map(
      async ({ code, dan, name, teaserimageurl, price, url }) => {
        const availableAt = await this.getProductAvailability({
          dan,
          postcodes,
          storeAddressesMap,
          price,
          url,
        });

        const smallerImageUrl = `${teaserimageurl}?width=310&height=140&fit=bounds`;

        return {
          gtin: code,
          title: name,
          imageUrl: smallerImageUrl,
          price,
          availableAt,
        };
      }
    );

    return Promise.all(promises);
  },

  async productSearch(query, storeAddressesMap) {
    try {
      const searchResult = await axios(
        `${
          process.env.ROSSMANN_PRODUCT_SEARCH_API
        }/de/search/suggest?q=${encodeURI(query)}`
      );

      if (
        !searchResult.data ||
        !searchResult.data.products ||
        !searchResult.data.products.results
      ) {
        return [];
      }

      return this.mapProducts({
        products: searchResult.data.products.results,
        storeAddressesMap,
        postcodes: RELEVANT_POSTCODES,
      });
    } catch (error) {
      console.error(error);
      return [];
    }
  },
};
