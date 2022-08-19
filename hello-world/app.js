// const axios = require('axios')
// const url = 'http://checkip.amazonaws.com/';
const { productSearch } = require("./src/search.js");

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Context doc: https://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-context.html 
 * @param {Object} context
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 * 
 */
exports.lambdaHandler = async (event, context) => {
    let response;

    try {
        let q = '';

        if (event.queryStringParameters) {
            q = event.queryStringParameters['q'] ?? '';
        }

        const products = await productSearch(q);

        response = {
            statusCode: 200,
            body: {
                products
            }
        };
    } catch (err) {
        console.log(err);
        return err;
    }

    return response
};
