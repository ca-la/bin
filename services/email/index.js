'use strict';

const fetch = require('node-fetch');
const FormData = require('form-data');

const { enqueueMessage } = require('../aws');
const { requireProperties } = require('../require-properties');
const {
  AWS_NOTIFICATION_SQS_URL,
  AWS_NOTIFICATION_SQS_REGION,
  MAILGUN_API_KEY,
  MAILGUN_API_BASE
} = require('../../config');

const MAILGUN_AUTH = new Buffer(`api:${MAILGUN_API_KEY}`).toString('base64');
const FROM = 'CALA <hi@ca.la>';

// XXX: DEPRECATED
// ALL NEW EMAILS SHOULD GO THROUGH THE EMAIL SERVICE
//
// See https://github.com/ca-la/notifications and `enqueueSend` below
function send(to, subject, emailBody) {
  const data = new FormData();
  data.append('from', FROM);
  data.append('to', to);
  data.append('subject', subject);
  data.append('html', emailBody);

  const url = `${MAILGUN_API_BASE}/messages`;

  return fetch(url, {
    method: 'post',
    headers: { Authorization: `Basic ${MAILGUN_AUTH}` },
    body: data
  }).then(response => response.json());
}

function enqueueSend(data) {
  requireProperties(data, 'to', 'templateName', 'params');

  return enqueueMessage(
    AWS_NOTIFICATION_SQS_URL,
    AWS_NOTIFICATION_SQS_REGION,
    'email',
    data
  );
}

module.exports = {
  enqueueSend,
  send
};
