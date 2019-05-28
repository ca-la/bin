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
  const response = yield fetch(
    `https://www.instagram.com/${this.params.handle}/media/`
  );

  if (response.status !== 200) {
    // Instagram appears to have removed this API as of 2017-11-07
    // We could rebuild it with the supported API and access tokens/rotation,
    // but for now, fake an empty response.
    this.body = { items: [] };
    this.status = 200;
    return;
  }

  const json = yield response.json();

  this.status = 200;
  this.body = json;
}

router.get('/:handle', getFeed);

module.exports = router.routes();
