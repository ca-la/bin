'use strict';

const fetch = require('node-fetch');
const FormData = require('form-data');

const { assertDomesticNumber } = require('../validation');
const {
  TWILIO_SID,
  TWILIO_TOKEN,
  TWILIO_OUTBOUND_NUMBER
} = require('../config');

const API_BASE = `https://${TWILIO_SID}:${TWILIO_TOKEN}@api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}`;

function sendSMS(to, message) {
  assertDomesticNumber(to);

  const data = new FormData();
  data.append('To', to);
  data.append('From', TWILIO_OUTBOUND_NUMBER);
  data.append('Body', message);

  const url = `${API_BASE}/Messages.json`;

  return fetch(url, {
    method: 'post',
    body: data
  }).then(response => response.json());
}

module.exports = {
  sendSMS
};
