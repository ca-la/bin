'use strict';

const Router = require('koa-router');

const { sendSMS } = require('../../services/twilio');

const router = new Router();

const DOWNLOAD_MESSAGE =
  'Welcome to CALA. To download our iPhone app, click here: https://ca.la/ios';

function* sendDownloadLink() {
  const { to } = this.request.body;

  yield sendSMS(to, DOWNLOAD_MESSAGE);

  this.status = 200;
  this.body = { sent: true };
}

router.post('/', sendDownloadLink);

module.exports = router.routes();
