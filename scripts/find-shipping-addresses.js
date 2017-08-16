'use strict';

// eslint-disable-next-line import/no-extraneous-dependencies,import/no-unresolved
const json2csv = require('/Users/dylan/n/lib/node_modules/json2csv');

// Parse a Shopify orders.json response and list shipping information for each
// unfulfilled order, grouped by the type of item
//
// Requires a file named `order-array.json` to be present in the script directory.
//
// Usage:
//   $ curl 'https://cala-usa.myshopify.com/admin/orders.json?limit=250' -u 'USER:PASS' | jq .orders > order-array.json
//   $ node find-shipping-addresses.js
//
// (you might need to request multipe pages and concat them if you have more
// than 250... todo bake that into this script)
//
// eslint-disable-next-line import/no-unresolved
const orders = require('./order-array.json')
  .filter((order) => {
    return (
      order.financial_status !== 'refunded' &&
      order.fulfillment_status !== 'fulfilled'
    );
  });

const sales = [];

orders.forEach((order) => {
  const products = [];

  order.line_items.forEach((item) => {
    products.push(item.title);
  });

  const details = {
    order_id: order.id,
    products: products.join('\n')
  };

  Object.assign(details, order.shipping_address);
  sales.push(details);
});

// eslint-disable-next-line no-console
console.log(json2csv({
  data: sales,
  preserveNewLinesInValues: true
}));
