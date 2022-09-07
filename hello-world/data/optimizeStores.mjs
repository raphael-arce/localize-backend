import fs from 'fs';
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const stores = require('./stores.json');
const optimizedStores = require('./optimizedStores.json');

for (const store of stores.stores) {
    if (store.address.city === 'Berlin') {
        optimizedStores[store.storeNumber] = {
            address: store.address,
            location: store.location
        }
    }
}

try {
    fs.writeFileSync('optimizedStores.json', JSON.stringify(optimizedStores));
    // file written successfully
} catch (err) {
    console.error(err);
}
