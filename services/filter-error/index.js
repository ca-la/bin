'use strict';

const { requireValues } = require('../require-properties');

// A more native-friendly equivalent of http://bluebirdjs.com/docs/api/catch.html#filtered-catch
//
// @example
//
// Shopify.doSomething()
//   .catch(filterError(ShopifyNotFoundError, (err) => {
//      console.log('Huh, not found...')
//      throw err
//   }))
function filterError(errorType, handler) {
  requireValues({ errorType, handler });

  return (err) => {
    if (err instanceof errorType) {
      handler(err);
    } else {
      throw err;
    }
  };
}

module.exports = filterError;
