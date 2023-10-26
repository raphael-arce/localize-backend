jest.mock('./src/search/searchEngine');
const searchEngine = require('./src/search/searchEngine');
const app = require('./app');

describe('app', () => {
  it('should return a correctly formed response', async () => {
    const givenEvent = {
      queryStringParameters: {
        q: 'weleda tagescreme granatapfel',
      },
    };
    const givenSearchResults = [];

    jest
      .spyOn(searchEngine, 'search')
      .mockImplementationOnce(() => givenSearchResults);

    const expectedResponse = {
      body: '[]',
      headers: {
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'OPTIONS,GET',
        'Access-Control-Allow-Origin': '*',
      },
      statusCode: 200,
    };

    const actualResponse = await app.lambdaHandler(givenEvent);

    expect(actualResponse).toEqual(expectedResponse);
  });

  it('should return a correctly formed response when no queryStringParams are given', async () => {
    const givenEvent = {
      queryStringParameters: undefined,
    };
    const givenSearchResults = [];

    jest
      .spyOn(searchEngine, 'search')
      .mockImplementationOnce(() => givenSearchResults);

    const expectedResponse = {
      body: '[]',
      headers: {
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'OPTIONS,GET',
        'Access-Control-Allow-Origin': '*',
      },
      statusCode: 200,
    };

    const actualResponse = await app.lambdaHandler(givenEvent);

    expect(actualResponse).toEqual(expectedResponse);
  });

  it('should return a correctly formed response when no query is given', async () => {
    const givenEvent = {
      queryStringParameters: {},
    };
    const givenSearchResults = [];

    jest
      .spyOn(searchEngine, 'search')
      .mockImplementationOnce(() => givenSearchResults);

    const expectedResponse = {
      body: '[]',
      headers: {
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'OPTIONS,GET',
        'Access-Control-Allow-Origin': '*',
      },
      statusCode: 200,
    };

    const actualResponse = await app.lambdaHandler(givenEvent);

    expect(actualResponse).toEqual(expectedResponse);
  });

  it('should throw an error when search throws an error', async () => {
    const givenEvent = {
      queryStringParameters: {
        q: 'weleda tagescreme granatapfel',
      },
    };

    jest.spyOn(searchEngine, 'search').mockImplementationOnce(() => {
      throw new Error('Something went wrong');
    });

    const expectedResponse = {
      body: 'Internal Server Error.',
      headers: {
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'OPTIONS,GET',
        'Access-Control-Allow-Origin': '*',
      },
      statusCode: 500,
    };

    const actualResponse = await app.lambdaHandler(givenEvent);

    expect(actualResponse).toEqual(expectedResponse);
  });
});
