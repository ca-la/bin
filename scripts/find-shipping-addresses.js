'use strict';

// Parse a Shopify orders.json response and list shipping information for each
// unfulfilled order, grouped by the type of item
//
// Requires a file named `order-array.json` to be present in the script directory.
//
// To create one:
//   curl 'https://cala-usa.myshopify.com/admin/orders.json?limit=1000' -u 'user:pass' | jq .orders > order-array.json
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
console.log(JSON.stringify(sales, null, 2));
