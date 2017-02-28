'use strict';

const fetch = require('node-fetch');
const Router = require('koa-router');

const router = new Router();

/**
 * GET /instagram-feed/:handle
 *
 * A little proxy to get around the fact that the Instagram API doesn't return
 * a JSON Content-Type and doesn't support CORS headers... can tighten up our
 * own CORS stuff if this gets abused.
 */
function* getFeed() {
  const response = yield fetch(`https://www.instagram.com/${this.params.handle}/media/`);

  this.assert(response.status === 200, 404, 'User not found');
  const json = yield response.json();

  this.status = 200;
  this.body = json;
}

router.get('/:handle', getFeed);

module.exports = router.routes();
