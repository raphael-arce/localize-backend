const app = require('./app');

describe('test', () => {
    it('test', async () => {
        const event = {
            queryStringParameters: {
                q: 'weleda tagescreme granatapfel'
            }
        }

        const result = await app.lambdaHandler(event, {});

    })

})