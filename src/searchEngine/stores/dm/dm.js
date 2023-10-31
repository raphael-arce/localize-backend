import STORES from './data/storesBerlin.json' assert { type: 'json' };

const STORE_IDS = Object.keys(STORES);

export default {
  async productSearch(query, storeAddressesMap, env) {
    try {
      const url = this.getProductSearchUrl(query, env);

      const response = await fetch(url);

      const searchResult = await response.json();

      if (!searchResult || !searchResult.products) {
        return [];
      }

      return this.mapProducts(
        {
          products: searchResult.products,
          storeAddressesMap,
          storeIds: STORE_IDS,
        },
        env
      );
    } catch (error) {
      console.error(error);
      return [];
    }
  },

  getProductSearchUrl(query, env) {
    return `${env.DM_PRODUCT_SEARCH_API}/de/search?query=${encodeURI(
      query
    )}&searchType=product&type=search`;
  },

  async mapProducts({ products, storeAddressesMap, storeIds }, env) {
    const promises = products.map(
      async ({
        dan,
        gtin,
        title,
        imageUrlTemplates,
        price,
        relativeProductUrl,
      }) => {
        const availableAt = await this.getProductAvailability(
          {
            dan,
            storeAddressesMap,
            storeIds,
            price,
            relativeProductUrl,
          },
          env
        );

        const imageUrl = imageUrlTemplates[0].replace(
          '{transformations}',
          'f_auto,q_auto,c_fit,h_270,w_260'
        );

        return {
          gtin: gtin.toString(),
          title,
          imageUrl,
          price,
          availableAt,
        };
      }
    );

    return Promise.all(promises);
  },

  async getProductAvailability(
    { dan, storeAddressesMap, storeIds, price, relativeProductUrl },
    env
  ) {
    try {
      const url = this.getProductAvailabilityUrl({ dan, storeIds, env });

      const response = await fetch(url);

      const availabilityResult = await response.json();

      return this.reduceAvailabilityResult({
        availabilityResult,
        storeAddressesMap,
        price,
        relativeProductUrl,
      });
    } catch (error) {
      console.error(error);
      return [];
    }
  },

  getProductAvailabilityUrl({ dan, storeIds, env }) {
    return `${env.DM_STORE_AVAILABILITY_API}/store-availability/DE/products/dans/${dan}/availability-with-listing?storeNumbers=${storeIds}&view=basic`;
  },

  reduceAvailabilityResult({
    availabilityResult,
    storeAddressesMap,
    price,
    relativeProductUrl,
  }) {
    if (!availabilityResult || !availabilityResult.storeAvailability) {
      return [];
    }

    return availabilityResult.storeAvailability.reduce(
      (accumulator, { store, inStock, stockLevel }) => {
        if (!inStock) {
          return accumulator;
        }

        const { storeNumber } = store;
        const uniqueStoreId = `DM_${storeNumber}`;
        if (!storeAddressesMap.has(uniqueStoreId)) {
          storeAddressesMap.set(uniqueStoreId, STORES[storeNumber]);
        }

        const { lat, lon } = STORES[storeNumber].location;

        accumulator.push({
          type: 'Feature',
          properties: {
            storeId: uniqueStoreId,
            inStock,
            formattedPrice: price.formattedValue,
            stockLevel,
            url: `https://www.dm.de${relativeProductUrl}`,
          },
          geometry: {
            type: 'Point',
            coordinates: [lon, lat],
          },
        });

        return accumulator;
      },
      []
    );
  },
};
