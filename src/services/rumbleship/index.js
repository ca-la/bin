'use strict';

const fetch = require('node-fetch');

const db = require('../db');
const InvalidDataError = require('../../errors/invalid-data');
const InvoicePaymentsDAO = require('../../dao/invoice-payments');
const InvoicesDAO = require('../../dao/invoices');
const JWT = require('../jwt');
const Logger = require('../logger');
const ProductDesignStatusesDAO = require('../../dao/product-design-statuses');
const ProductDesignsDAO = require('../../dao/product-designs');
const SlackService = require('../slack');
const UsersDAO = require('../../dao/users');
const { requireValues } = require('../../services/require-properties');
const updateDesignStatus = require('../update-design-status');
const {
  RUMBLESHIP_API_BASE,
  RUMBLESHIP_PAY_BASE,
  STUDIO_HOST
} = require('../../config');

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
 * (4) [Backend] Using the { b, s } JWT, we create a "purchase order", and
 * return the purchase ID to the client.
 *
 * (5) [Frontend] The app redirects the user to Rumbleship, using the
 * { b, s } token and purchase ID in the URL. Once complete, the user is
 * redirected back to a new page inside our app, with a new { b, s, subt, po }
 * token in a query parameter.
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

function getToken(response) {
  const jwt = response.headers.get('authorization');

  if (!jwt) {
    Logger.logServerError('Rumbleship response: ', response);
    throw new Error('Rumbleship API call did not return a JWT');
  }

  const decoded = JWT.decode(jwt);
  return { jwt, decoded };
}

function getCheckoutUrl({ purchaseHash, bsToken }) {
  return `${RUMBLESHIP_PAY_BASE}/purchase-orders/${purchaseHash}?token=${bsToken}`;
}

function getFeeCents(invoiceAmountCents, feePercentage) {
  return Math.round(invoiceAmountCents / (1 - feePercentage)) - invoiceAmountCents;
}

class Rumbleship {
  constructor({ apiKey, apiBase }) {
    requireValues({ apiKey });
    this._apiKey = apiKey;
    this._apiBase = apiBase || RUMBLESHIP_API_BASE;
  }

  async makeRequest({
    method, path, jwt, data
  }) {
    requireValues({ method, path });

    const url = `${this._apiBase}${path}`;

    const options = { method, headers: {} };

    if (jwt) {
      options.headers.Authorization = jwt;
    }

    if (data) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(data, null, 2);
    }

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
      Logger.logServerError('Rumbleship request: ', method, url);
      Logger.logServerError('Rumbleship response:', body);
      throw new Error(`Rumbleship returned ${response.status} status (see logs)`);
    }

    return { body, response };
  }

  /**
  * Get the initial authorization to discover if a customer is eligible to use a
  * deferred payment plan.
  *
  * If the customer is authorized, returns a { b, s } JWT that can be used for
  * the next request.
  */
  async getBuyerAuthorization(options = {}) {
    const { customerEmail } = options;

    const { body, response } = await this.makeRequest({
      method: 'post',
      path: '/gateway/login',
      data: {
        id_token: this._apiKey,
        email: customerEmail
      }
    });

    Logger.log('Rumbleship: Get buyer authorization response:', body);

    const { jwt, decoded } = getToken(response);

    if (!decoded.s) {
      Logger.logServerError('Decoded token:', decoded);
      throw new Error('Rumbleship token did not include `s` claim');
    }

    if (decoded.b) {
      return {
        isBuyerAuthorized: true,
        buyerHash: decoded.b,
        supplierHash: decoded.s,
        bsToken: jwt
      };
    }

    return {
      isBuyerAuthorized: false
    };
  }

  /**
  * Get a { s } auth token that allows us to make privileged supplier API calls.
  *
  * NOTE: {s} TOKENS ARE NOT SAFE TO SEND TO THE CLIENT. All tokens must be
  * inspected before being passed around. Is this common in the JWT world? Seems
  * very odd.
  */
  async getSupplierAuthorization() {
    const { body, response } = await this.makeRequest({
      method: 'post',
      path: '/gateway/login',
      data: {
        id_token: this._apiKey
      }
    });

    Logger.log('Rumbleship: Get supplier authorization response:', body);

    const { jwt, decoded } = getToken(response);

    if (!decoded.s) {
      Logger.logServerError('Decoded token:', decoded);
      throw new Error('Rumbleship token did not include `s` claim');
    }

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
  async createPurchaseOrder({
    bsToken,
    buyerHash,
    feePercentage,
    invoice,
    partnerId,
    supplierHash
  }) {
    requireValues({
      buyerHash, supplierHash, invoice, bsToken
    });

    const invoiceAmountCents = invoice.totalCents;
    const feeCents = getFeeCents(invoiceAmountCents, feePercentage);
    const totalBilledCents = invoiceAmountCents + feeCents;

    const { body } = await this.makeRequest({
      method: 'post',
      path: `/buyers/${buyerHash}/suppliers/${supplierHash}/purchase-orders`,
      data: {
        total_cents: totalBilledCents,
        subtotal_cents: totalBilledCents,
        shipping_total_cents: 0,
        line_items: [
          {
            name: `CALA Invoice: ${invoice.title}`,
            cost_cents: invoiceAmountCents,
            quantity: 1,
            total_cents: invoiceAmountCents
          },
          {
            name: 'Payment Processing Fee',
            cost_cents: feeCents,
            quantity: 1,
            total_cents: feeCents
          }
        ],
        misc: {
          x_rurl: `${STUDIO_HOST}/complete-partner-checkout?designId=${invoice.designId}&invoiceId=${invoice.id}&partnerId=${partnerId}`,
          x_oid: invoice.id
        }
      },
      jwt: bsToken
    });

    Logger.log('Rumbleship: Create purchase order response:', body);

    if (!body.hashid) {
      throw new Error('Rumbleship response did not include `po` hashid');
    }

    return {
      purchaseHash: body.hashid
    };
  }

  /**
  * Confirm that we've received an order from a user. To be used *after* they've
  * completed the Rumbleship checkout flow using the poToken received from the
  * post-checkout redirect callback.
  */
  async createPreShipment({
    purchaseHash,
    poToken,
    totalBilledCents
  }) {
    requireValues({ purchaseHash, poToken, totalBilledCents });

    const { body } = await this.makeRequest({
      method: 'post',
      path: `/purchase-orders/${purchaseHash}/confirm-for-shipment`,
      data: {
        total_cents: totalBilledCents,
        subtotal_cents: totalBilledCents,
        shipping_total_cents: 0,
        billing_address: {},
        shipping_address: {}
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
  async createShipment({ purchaseHash, sToken }) {
    requireValues({ purchaseHash, sToken });

    const { body } = await this.makeRequest({
      method: 'post',
      path: `/purchase-orders/${purchaseHash}/shipments`,
      data: {
        shipping_cents: 0
      },
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
  async confirmFullOrder({
    feePercentage,
    invoiceId,
    poToken,
    purchaseHash,
    userId
  }) {
    return db.transaction(async (trx) => {
      // We acquire an update lock on the relevant invoice row to make sure we can
      // only be in the process of paying for one invoice at a given time.
      await db.raw('select * from invoices where id = ? for update', [invoiceId])
        .transacting(trx);

      const invoice = await InvoicesDAO.findByIdTrx(trx, invoiceId);

      if (invoice.isPaid) {
        throw new InvalidDataError('This invoice is already paid');
      }

      const invoiceAmountCents = invoice.totalCents;
      const feeCents = getFeeCents(invoiceAmountCents, feePercentage);
      const totalBilledCents = invoiceAmountCents + feeCents;

      await this.createPreShipment({ purchaseHash, poToken, totalBilledCents });

      const { sToken } = await this.getSupplierAuthorization();
      await this.createShipment({ purchaseHash, sToken });

      await InvoicePaymentsDAO.createTrx(trx, {
        invoiceId: invoice.id,
        totalCents: invoice.totalCents,
        rumbleshipPurchaseHash: purchaseHash
      });

      const design = await ProductDesignsDAO.findById(invoice.designId);
      const status = await ProductDesignStatusesDAO.findById(design.status);

      requireValues({ design, status });

      if (status.nextStatus) {
        await updateDesignStatus(
          invoice.designId,
          status.nextStatus,
          userId
        );
      }

      try {
        await SlackService.enqueueSend({
          channel: 'designers',
          templateName: 'designer_payment',
          params: {
            design,
            designer: await UsersDAO.findById(design.userId),
            paymentAmountCents: totalBilledCents
          }
        });
      } catch (e) {
        Logger.logWarning('There was a problem sending the payment notification to Slack', e);
      }
    });
  }
}

Rumbleship.getCheckoutUrl = getCheckoutUrl;

module.exports = Rumbleship;