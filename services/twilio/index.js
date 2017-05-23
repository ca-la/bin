'use strict';

const fetch = require('node-fetch');
const FormData = require('form-data');

const sanitizeHtml = require('../sanitize-html');
const { validateAndFormatPhoneNumber } = require('../validation');
const {
  TWILIO_SID,
  TWILIO_TOKEN,
  TWILIO_OUTBOUND_NUMBER
} = require('../config');

const API_BASE = `https://${TWILIO_SID}:${TWILIO_TOKEN}@api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}`;

function sendSMS(to, message, mediaUrl) {
  const formatted = validateAndFormatPhoneNumber(to);

  const data = new FormData();
  data.append('To', formatted);
  data.append('From', TWILIO_OUTBOUND_NUMBER);
  data.append('Body', message);

  if (mediaUrl) {
    data.append('MediaUrl', mediaUrl);
  }

  const url = `${API_BASE}/Messages.json`;

  return fetch(url, {
    method: 'post',
    body: data
  }).then(response => response.json());
}

/**
 * @param {String} message SMS message copy
 * @returns {String} TwilioML (XML) to send the given message
 */
function buildSMSResponseMarkup(message) {
  return `
<?xml version="1.0" encoding="UTF-8"?>
<Response><Sms>${sanitizeHtml(message)}</Sms></Response>
  `;
}

module.exports = {
  sendSMS,
  buildSMSResponseMarkup
};
