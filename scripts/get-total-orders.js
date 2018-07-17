'use strict';

// eslint-disable-next-line
const json2csv = require('/Users/dylan/n/lib/node_modules/json2csv');

// Parse a Shopify orders.json response and list total $$ billed for each order
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
    return (order.financial_status !== 'refunded');
  });

const sales = [];

orders.forEach((order) => {
  const products = [];

  order.line_items.forEach((item) => {
    products.push(`${item.vendor} — ${item.title}`);
  });

  const totalRefundAmount = order.refunds.reduce((memo, refund) => {
    return memo + refund.transactions.reduce((tmemo, txn) => {
      return memo + Number(txn.amount);
    }, 0);
  }, 0);

  const details = {
    order_id: order.id,
    timestamp: order.created_at,
    email: order.email,
    financial_status: order.financial_status,
    products: products.join('\n'),
    original_total_sale_price: order.total_price,
    total_refund_amount: totalRefundAmount
  };


  sales.push(details);
});

// eslint-disable-next-line no-console
console.log(json2csv({
  data: sales,
  preserveNewLinesInValues: true
}));
