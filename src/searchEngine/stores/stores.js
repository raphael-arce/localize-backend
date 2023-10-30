import dm from './dm/dm.js';
import rossmann from './rossmann/rossmann.js';

export default {
  getStores() {
    return [rossmann, dm];
  },
};
