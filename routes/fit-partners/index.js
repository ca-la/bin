'use strict';

const Router = require('koa-router');

const router = new Router();

function* sendFitLink() {
  const { partnerId, shopifyUserId } = this.request.body;
  this.status = 200;
}

router.post('/send-fit-link', sendFitLink);

module.exports = router.routes();
