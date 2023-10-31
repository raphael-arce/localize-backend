export default {
  async mockedFetch(url) {
    if (url.includes('https://www.rossmann.de/de/search/')) {
      return {
        json: () => ({
          products: {
            results: [
              {
                code: 'code1',
                dan: 'dan1',
                name: 'title1',
                teaserimageurl: 'teaserimageurl1',
                price: {
                  value: 1.95,
                  formattedValue: '1,95 €',
                },
                url: 'url1',
              },
              {
                code: 'code2',
                dan: 'dan2',
                name: 'title2',
                teaserimageurl: 'teaserimageurl2',
                price: {
                  value: 2.95,
                  formattedValue: '1,95 €',
                },
                url: 'url2',
              },
            ],
          },
        }),
      };
    }

    if (url.includes('https://www.rossmann.de/storefinder/')) {
      return {
        json: () => ({
          store: [
            {
              id: '330',
              productInfo: [{ available: true }],
              city: 'Berlin',
            },
            {
              id: '331',
              productInfo: [{ available: true }],
              city: 'Berlin',
            },
          ],
        }),
      };
    }

    if (url.includes('https://product-search.services.dmtech.com/')) {
      return {
        json: () => ({
          products: [
            {
              dan: 'productDan1',
              gtin: 'productGtin1',
              title: 'title1',
              imageUrlTemplates: ['https://example.com/image1.jpg'],
              price: {
                value: 1.99,
                formattedValue: '1,99 €',
              },
              relativeProductUrl: '/product/1',
            },
            {
              dan: 'productDan2',
              gtin: 'productGtin2',
              title: 'title2',
              imageUrlTemplates: ['https://example.com/image2.jpg'],
              price: {
                value: 2.99,
                formattedValue: '2,99 €',
              },
              relativeProductUrl: '/product/2',
            },
          ],
        }),
      };
    }

    if (
      url.includes('https://products.dm.de/store-availability/DE/products/')
    ) {
      return {
        json: () => ({
          storeAvailability: [
            {
              inStock: true,
              store: {
                storeNumber: '1000',
              },
              stockLevel: 1,
            },
            {
              inStock: true,
              store: {
                storeNumber: '1018',
              },
              stockLevel: 2,
            },
          ],
        }),
      };
    }

    throw new Error(`Unhandled URL: ${url}`);
  },
};
