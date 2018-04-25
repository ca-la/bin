'use strict';

const Router = require('koa-router');

const router = new Router();

// eslint-disable-next-line no-empty-function
function* sendFitLink() {
}

router.post('/send-fit-link', sendFitLink);

module.exports = router.routes();
