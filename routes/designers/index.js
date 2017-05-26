/**
 * GET /designers
 */
function* getList() {
  const products = yield Shopify.getAllProducts(filters, options);

  this.body = products;
  this.status = 200;
}
