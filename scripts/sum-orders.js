'use strict';

// Parse a Shopify orders.json response and list the number of sales by each
// type of item
//
// Requires a file named `orders.json` to be present in the script directory.
//
// To create one:
//   curl 'https://cala-usa.myshopify.com/admin/orders.json' -u 'user:pass' | jq . > orders.json
//
// eslint-disable-next-line import/no-unresolved
const orders = require('./orders.json')
  .orders
  .filter(o => o.financial_status !== 'refunded');

const sales = {};

orders.forEach((order) => {
  order.line_items.forEach((item) => {
    const current = sales[item.title] || 0;
    sales[item.title] = current + item.quantity;
  });
});

// eslint-disable-next-line no-console
console.log(JSON.stringify(sales, null, 2));
