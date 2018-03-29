'use strict';

const fetch = require('node-fetch');
const qs = require('querystring');

const JWT = require('../../services/jwt');
const Logger = require('../logger');
const { requireValues } = require('../../services/require-properties');
const { RUMBLESHIP_API_BASE, RUMBLESHIP_API_KEY } = require('../../config');

/**
 * Glossary:
 * - "Supplier": Us, a provider of items.
 * - "Buyer": THe designers who purchase items & services from us.
 * - "JWT": A JSON Web Token containing signed information.
 * - "claim": Some of the information within the JWT payload. Not encrypted, but
 *   signed securely.
 *
 * Rumbleship uses JWT authorization, with tokens that can contain several types
 * of claims. Here's a quick breakdown:
 *
 * - sToken: { s }: A token containing only "supplier" authorization, returned
 *   from the login endpoint, which we use for privileged requests and should
 *   NOT be exposed to the client.
 * - bsToken: { b, s }: A token containing "buyer" and "supplier" authorization,
 *   returned from the login endpoint if a designer is authorized to use
 *   Rumbleship, which can be exposed publicly.
 * - poToken: { b, s, subt, po }: A token containing information about a
 *   "purchase order", returned from the eponymous endpoint, which can be
 *   exposed publicly.
 *
 * Our interface with Rumbleship involves several steps:
 *
 * (1) [Frontend] The Studio app makes a request to our API when the payment
 * modal is opened, to determine whether the customer can use Rumbleship.
 *
 * (2) [Backend] Our API hits Rumbleship to determine whether the customer is
 * eligible. If so, it returns a { b, s } JWT that must be used for further
 * requests. If not, Rumbleship returns a { s } JWT.
 *
 * (3) [Frontend] The client stores the { b, s } JWT locally if authorized, and
 * shows the Rumbleship checkout button. When clicked, this sends the { b, s }
 * token back to our API, along with the invoice ID.
 *
 * (4) [Backend] Using the { b, s } JWT, we create a "purchase order". This
 * returns a { b, s, subt, po } token. We decode this and send it back to the
 * client.
 *
 * (5) [Frontend] The app redirects the user to Rumbleship, using the
 * { b, s, subt, po } token in the URL. The client saves the token for later
 * use. Once complete, the user is redirected back to a new page inside our app.
 *
 * (6) [Frontend] The app calls our API with the { b, s, subt, po } token upon
 * completion, to indicate that checkout was complete.
 *
 * (7) [Backend] We use the { b, s, subt, po } token to call Rumbleship and
 * indicate that the checkout process was completed ("confirm for shipment").
 *
 * (8) [Backend] We hit the Rumbleship login endpoint without a customer email
 * to return a priveledged { s } token.
 *
 * (9) [Backend] We use the { s } token to hit the Rumbleship API and mark the
 * purchase as "shipped" immediately, as we don't have a distinct shipping step
 * for many of our services.
 */

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

  return { body: json, response };
}

function getToken(response) {
  const jwt = response.headers.get('authorization');

  if (!jwt) {
    Logger.logServerError('Rumbleship response: ', response, body);
    throw new Error('Rumbleship API call did not return a JWT');
  }

  const decoded = JWT.decode(jwt);
  return { jwt, decoded };
}

/**
 * Get the initial authorization to discover if a customer is eligible to use a
 * deferred payment plan.
 *
 * Regardless of whether the customer is authorized, returns a JWT that can be
 * used for the next request. If the customer is authorized, this is a { b, s }
 * unprivileged token. If not, returns an { s } privileged token.
 *
 * As a result, note that `customerEmail` is not required if we only need
 * "supplier" authorization.
 *
 * NOTE: {s} TOKENS ARE NOT SAFE TO SEND TO THE CLIENT. All tokens must be
 * inspected before being passed around. Is this common in the JWT world? Seems
 * very odd.
 */
async function getAuthorization({ customerEmail }) {
  const { body, response } = await makeRequest({
    method: 'post',
    path: '/gateway/login',
    data: {
      id_token: RUMBLESHIP_API_KEY,
      email: customerEmail
    }
  });

  const { jwt, decoded } = getToken(response);

  if (decoded.b) {
    return {
      isBuyerAuthorized: true,
      buyerHash: decoded.b,
      supplierHash: decoded.s,
      bsToken: jwt
    };
  }

  return {
    isBuyerAuthorized: false,
    sToken: jwt,
    supplierHash: decoded.s
  };
}

/**
 * Create a "purchase order" to indicate intent to go through with the purchase.
 * The `purchaseHash` this returns is used to construct the URL to send people
 * to the Rumbleship payment form, so we need to call this at some point before
 * we can send them there.
 *
 * @param {String} bsToken A buyer + supplier { b, s } token
 */
async function createPurchaseOrder({ buyerHash, supplierHash, invoice, bsToken }) {
  requireValues({ buyerHash, supplierHash, invoice, bsToken });

  const { body, response } = await makeRequest({
    method: 'post',
    path: `/buyers/${buyerHash}/suppliers/${supplierHash}/purchase-orders`,
    data: {
      total_cents: invoice.totalCents,
      subtotal_cents: invoice.totalCents,
      shipping_total_cents: 0,
      line_items: [],
      misc: {
        x_oid: invoice.id
      }
    },
    jwt: bsToken
  });

  const { jwt, decoded } = getToken(response);

  return {
    purchaseHash: decoded.po,
    poToken: jwt
  };
}

/**
 * Confirm that we've received an order from a user. To be used *after* they've
 * completed the Rumbleship checkout flow using the poToken received from
 * createPurchaseOrder above.
 */
async function confirmPreShipment({ purchaseHash, poToken, invoice }) {
  requireValues({ purchaseHash, poToken, invoice });

  const { body, response } = await makeRequest({
    method: 'post',
    path: `/purchase-orders/${purchaseHash}/confirmshipment`,
    data: {
      total_cents: invoice.totalCents,
      subtotal_cents: invoice.totalCents,
      shipping_total_cents: 0,
    },
    jwt: poToken
  });

  const { jwt, decoded } = getToken(response);

  return { confirmed: true };
}

/**
 * Mark an order as shipped, and start the countdown for a customer to pay
 * Rumbleship. Note that we don't use "shipped" literally; in practice, we're
 * going to call this immediately after `confirmPreShipment` as not all of our
 * orders correspond to an actual shipment.
 *
 * Note: requires an `sToken` received from calling `getAuthorization` without
 * an email address.
 */
async function confirmShipment({ purchaseHash, sToken }) {
  requireValues({ purchaseHash, sToken });

  const { body, response } = await makeRequest({
    method: 'post',
    path: `/purchase-orders/${purchaseHash}/shipments`,
    data: {},
    jwt: sToken
  });

  const { jwt, decoded } = getToken(response);

  return { confirmed: true };
}
