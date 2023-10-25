const searchEngine = require('./src/search/searchEngine');

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */
exports.lambdaHandler = async (event) => {
  const headers = {
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'OPTIONS,GET',
  };

  try {
    let q = '';

    if (event.queryStringParameters) {
      q = event.queryStringParameters['q'] ?? '';
    }

    const result = JSON.stringify(await searchEngine.search(q));

    return {
      statusCode: 200,
      headers,
      body: result,
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: 'Internal Server Error.',
    };
  }
};
