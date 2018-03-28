'use strict';

const fetch = require('node-fetch');
const qs = require('querystring');

const insecureHash = require('../insecure-hash');
const InvalidPaymentError = require('../../errors/invalid-payment');
const Logger = require('../logger');
const PaymentMethodsDAO = require('../../dao/payment-methods');
const { requireValues } = require('../../services/require-properties');
const { RUMBLESHIP_API_BASE, RUMBLESHIP_API_KEY } = require('../../config');

async function makeRequest({ method, path, jwt, data }) {
  requireValues({ method, path });

  const url = `${base}${path}`;

  const options = { method };

  if (jwt) {
    options.headers = {
      Authorization: jwt
    };
  }

  if (data) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(data, null, 2);
  }

  const response = await fetch(url, options);
  const contentType = response.headers.get('content-type');
  const isJson = /application\/.*json/.test(contentType);

  if (!isJson) {
    const text = await response.text();
    Logger.logServerError('Rumbleship request: ', method, url);
    Logger.logServerError('Rumbleship response: ', response.status, text);
    throw new Error(`Unexpected Rumbleship response type: ${contentType}`);
  }

  const json = await response.json();

  if (response.status < 200 || response.status > 299) {
    throw new RumbleshipError(json.error);
  }

  return json;
}

/**
 * Get the initial authorization to discover if a customer is eligible to use a
 * deferred payment plan. If they are, returns a JWT that should be used for
 * the next request.
 *
 * Unfortunately this means that the clients have to have some knowledge of
 * the rumbleship JWT in order to execute later requsts. A bit clunky but seems
 * probably preferable to storing it in our DB?
 */
async function getAuthorization({ email }) {
  requireValues({ email });

  return makeRequest({
    method: 'post',
    path: '/gateway/login',
    data: {
      id_token: RUMBLESHIP_API_KEY,
      email
    }
  });
}

async function createPurchaseOrder() {

}

async function confirmOrder() {

}

async function confirmShipment() {

}
