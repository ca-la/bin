'use strict';

const fetch = require('node-fetch');
const FormData = require('form-data');

const { MAILGUN_API_KEY, MAILGUN_API_BASE } = require('../config');

const MAILGUN_AUTH = new Buffer(`api:${MAILGUN_API_KEY}`).toString('base64');
const FROM = 'CALA <hi@ca.la>';

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

module.exports = {
  send
};
