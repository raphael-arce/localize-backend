import RELEVANT_POSTCODES from './data/reducedPostcodesWithShops.json' assert { type: 'json' };
import STORES from './data/storesBerlin.json' assert { type: 'json' };

export default {
  async productSearch(query, storeAddressesMap, env) {
    try {
      const url = this.getProductSearchUrl(query, env);

      const response = await fetch(url);

      const searchResult = await response.json();

      if (
        !searchResult ||
        !searchResult.products ||
        !searchResult.products.results
      ) {
        return [];
      }

      return this.mapProducts(
        {
          products: searchResult.products.results,
          storeAddressesMap,
          postcodes: RELEVANT_POSTCODES,
        },
        env
      );
    } catch (error) {
      console.error(error);
      return [];
    }
  },

  getProductSearchUrl(query, env) {
    return `${env.ROSSMANN_PRODUCT_SEARCH_API}/de/search/suggest?q=${encodeURI(
      query
    )}`;
  },

  async mapProducts({ products, storeAddressesMap, postcodes }, env) {
    const promises = products.map(
      async ({ code, dan, name, teaserimageurl, price, url }) => {
        const availableAt = await this.getProductAvailability(
          {
            dan,
            postcodes,
            storeAddressesMap,
            price,
            url,
          },
          env
        );

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

  async getProductAvailability(
    { dan, postcodes, storeAddressesMap, price, url },
    env
  ) {
    const availabilityMap = new Map();
    const availabilityPromises = postcodes.map(async (postcode) => {
      try {
        const productAvailabilityUrl = this.getProductAvailabilityUrl({
          dan,
          postcode,
          env,
        });

        const response = await fetch(productAvailabilityUrl);

        const availabilityResult = await response.json();

        this.mergeAvailabilityResult({
          availabilityMap,
          availabilityResult,
          storeAddressesMap,
          price,
          url,
        });
      } catch (error) {
        console.error(error);
      }
    });

    await Promise.all(availabilityPromises);

    return Array.from(availabilityMap.values());
  },

  getProductAvailabilityUrl({ dan, postcode, env }) {
    return `${env.ROSSMANN_STORE_AVAILABILITY_API}/storefinder/.rest/store?dan=${dan}&q=${postcode}`;
  },

  mergeAvailabilityResult({
    availabilityMap,
    availabilityResult,
    storeAddressesMap,
    price,
    url,
  }) {
    if (!availabilityResult || !availabilityResult.store) {
      return;
    }

    availabilityResult.store.forEach(({ id, productInfo, city }) => {
      const { available } = productInfo[0];
      const uniqueStoreId = `ROSSMANN_${id}`;

      if (
        !available ||
        city !== 'Berlin' ||
        availabilityMap.has(uniqueStoreId) ||
        !STORES[id]
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
};
