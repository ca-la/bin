'use strict';

const fetch = require('node-fetch');

const JWT = require('../../services/jwt');
const Logger = require('../logger');
const { requireValues } = require('../../services/require-properties');
const { RUMBLESHIP_API_BASE, RUMBLESHIP_API_KEY } = require('../../config');

/**
 * Methods for interacting with Rumbleship, our flexible payment provider.
 * These endpoints and more are documented in the private document "RFI
 * Integration Guide" that they have provided.
 *
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

  const url = `${RUMBLESHIP_API_BASE}${path}`;

  const options = { method, headers: {} };

  if (jwt) {
    options.headers.Authorization = jwt;
  }

  if (data) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(data, null, 2);
  }

  console.log(url, options);

  const response = await fetch(url, options);
  const contentType = response.headers.get('content-type');
  const isJson = /application\/.*json/.test(contentType);

  let body;

  if (isJson) {
    body = await response.json();
  } else {
    body = await response.text();

    if (body !== '') {
      // Rumbleship API returns empty response bodies for some 200s
      Logger.logServerError('Rumbleship request: ', method, url);
      Logger.logServerError('Rumbleship response: ', response.status, response.headers, body);
      throw new Error(`Unexpected Rumbleship response type: ${contentType}`);
    }
  }

  if (response.status < 200 || response.status > 299) {
    Logger.logServerError('Rumbleship error:', body);
    throw new Error(`Rumbleship returned ${response.status} status (see logs)`);
  }

  return { body, response };
}

function getToken(response) {
  const jwt = response.headers.get('authorization');

  if (!jwt) {
    Logger.logServerError('Rumbleship response: ', response);
    throw new Error('Rumbleship API call did not return a JWT');
  }

  const decoded = JWT.decode(jwt);
  return { jwt, decoded };
}

/**
 * Get the initial authorization to discover if a customer is eligible to use a
 * deferred payment plan.
 *
 * If the customer is authorized, returns a { b, s } JWT that can be used for
 * the next request.
 */
async function getBuyerAuthorization(options = {}) {
  const { customerEmail } = options;

  const { body, response } = await makeRequest({
    method: 'post',
    path: '/gateway/login',
    data: {
      id_token: RUMBLESHIP_API_KEY,
      email: customerEmail
    }
  });

  Logger.log('Rumbleship: Get buyer authorization response:', body);

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
    supplierHash: decoded.s
  };
}

/**
 * Get a { s } auth token that allows us to make privileged supplier API calls.
 *
 * NOTE: {s} TOKENS ARE NOT SAFE TO SEND TO THE CLIENT. All tokens must be
 * inspected before being passed around. Is this common in the JWT world? Seems
 * very odd.
 */
async function getSupplierAuthorization() {
  const { body, response } = await makeRequest({
    method: 'post',
    path: '/gateway/login',
    data: {
      id_token: RUMBLESHIP_API_KEY
    }
  });

  Logger.log('Rumbleship: Get supplier authorization response:', body);

  const { jwt, decoded } = getToken(response);

  return {
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

  Logger.log('Rumbleship: Create purchase order response:', body);

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
async function createPreShipment({ purchaseHash, poToken, invoice }) {
  requireValues({ purchaseHash, poToken, invoice });

  const { body } = await makeRequest({
    method: 'post',
    path: `/purchase-orders/${purchaseHash}/confirmshipment`,
    data: {
      total_cents: invoice.totalCents,
      subtotal_cents: invoice.totalCents,
      shipping_total_cents: 0
    },
    jwt: poToken
  });

  Logger.log('Rumbleship: Create preshipment response:', body);

  return { confirmed: true };
}

/**
 * Mark an order as shipped, and start the countdown for a customer to pay
 * Rumbleship. Note that we don't use "shipped" literally; in practice, we're
 * going to call this immediately after `createPreShipment` as not all of our
 * orders correspond to an actual shipment.
 *
 * Note: requires an `sToken` received from calling `getSupplierAuthorization`.
 */
async function createShipment({ purchaseHash, sToken }) {
  requireValues({ purchaseHash, sToken });

  const { body } = await makeRequest({
    method: 'post',
    path: `/purchase-orders/${purchaseHash}/shipments`,
    data: {},
    jwt: sToken
  });

  Logger.log('Rumbleship: Create shipment response:', body);

  return { confirmed: true };
}

/**
  * "confirm a shipment" and then "create a shipment", i.e. everything we have
  * to do to confirm the transaction after a customer checks out with
  * Rumbleship.
  */
async function confirmFullOrder({ purchaseHash, poToken, invoice }) {
  await createPreShipment({ purchaseHash, poToken, invoice });

  const { sToken } = await getSupplierAuthorization();
  await createShipment({ purchaseHash, sToken });
}

module.exports = {
  getBuyerAuthorization,
  createPurchaseOrder,
  confirmFullOrder
};
