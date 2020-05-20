"use strict";

const Router = require("koa-router");

const router = new Router();

// eslint-disable-next-line require-yield
function* getProducts() {
  this.throw(
    400,
    "We're sunsetting the CALA iPhone app to focus our resources on CALA Studio and new cross-platform CALA Fit products. Please contact us at hi@ca.la if you have any questions."
  );
}

router.get("/", getProducts);

module.exports = router.routes();
