'use strict';

const Router = require('koa-router');

const FitPartnerCustomersDAO = require('../../dao/fit-partner-customers');
const FitPartnerScanService = require('../../services/fit-partner-scan');
const FitPartnersDAO = require('../../dao/fit-partners');
const InvalidDataError = require('../../errors/invalid-data');
const Logger = require('../../services/logger');
const ScansDAO = require('../../dao/scans');
const Twilio = require('../../services/twilio');
const Configuration = require('../../config');
const { requireValues } = require('../../services/require-properties');
const { validatePropertiesFormatted } = require('../../services/validate');
const { validateAndFormatPhoneNumber } = require('../../services/validation');

const router = new Router();

function substituteLink(message, link) {
  return message.replace(/{{link}}/g, link);
}

const DEFAULT_SMS_COPY =
  'To complete your fitting, open this link on your mobile device: {{link}}';

async function createAndSendScanLink({
  partnerId,
  phoneNumber,
  shopifyUserId
}) {
  requireValues({ partnerId, phoneNumber });

  const normalizedPhone = validateAndFormatPhoneNumber(phoneNumber);

  const partner = await FitPartnersDAO.findById(partnerId);
  if (!partner) {
    throw new InvalidDataError(`Unknown partner ID: ${partnerId}`);
  }

  const customerData = shopifyUserId
    ? { partnerId, shopifyUserId }
    : { partnerId, phone: normalizedPhone };

  const customer = await FitPartnerCustomersDAO.findOrCreate(customerData);

  const scan = await ScansDAO.create({
    fitPartnerCustomerId: customer.id,
    type: 'PHOTO'
  });

  const fitHost = partner.customFitDomain || Configuration.FIT_CLIENT_HOST;
  const link = `${fitHost}/scans/${scan.id}`;

  const fitCopy = substituteLink(partner.smsCopy || DEFAULT_SMS_COPY, link);

  await FitPartnerScanService.saveFittingUrl(customer.id, link);

  await Twilio.sendSMS(normalizedPhone, fitCopy);
  return link;
}

function* sendFitLink() {
  validatePropertiesFormatted(this.request.body, {
    partnerId: 'Partner ID',
    phoneNumber: 'Phone number'
  });

  const { partnerId, phoneNumber, shopifyUserId } = this.request.body;

  const link = yield createAndSendScanLink({
    partnerId,
    phoneNumber,
    shopifyUserId
  });

  this.status = 201;
  this.body = { link };
}

function* shopifyOrderCreated() {
  const assert = (truthy, message) => {
    if (truthy) return;
    Logger.logServerError(message);
    this.throw(400, message);
  };

  const { partnerId } = this.params;
  const {
    shipping_address: shippingAddress,
    customer,
    line_items: lineItems
  } = this.request.body;

  const isAllBlacklisted = lineItems.every(lineItem => {
    return Configuration.FIT_PARTNER_SMS_PRODUCT_ID_BLACKLIST.includes(
      lineItem.product_id
    );
  });

  if (isAllBlacklisted) {
    this.status = 200;
    this.body = { success: true };
    return;
  }

  if (!shippingAddress) {
    this.status = 200;
    this.body = { success: true };
    return;
  }

  const phoneNumber = shippingAddress.phone;
  if (!phoneNumber) {
    this.status = 200;
    this.body = { success: true };
    return;
  }

  assert(customer, 'Missing customer payload');
  const shopifyUserId = customer.id;
  assert(shopifyUserId, 'Missing customer Id');

  yield createAndSendScanLink({
    partnerId,
    phoneNumber,
    shopifyUserId
  });

  const claimed = yield FitPartnerCustomersDAO.claimPhoneRecord({
    phone: phoneNumber,
    shopifyUserId
  });

  if (claimed) {
    // The customer had completed an "anonymous" scan with only a phone number
    // on file, which is now associated with their Shopify user. We save these
    // values to Shopify, as they're the most complete source of truth we have
    // so far.
    const allScans = yield ScansDAO.findByFitPartnerCustomer(claimed.id);
    const completedScans = allScans.filter(scan => scan.isComplete);

    if (completedScans.length > 0) {
      const latest = completedScans[completedScans.length - 1];
      if (latest.measurements && latest.measurements.calculatedValues) {
        yield FitPartnerScanService.saveCalculatedValues(latest);
      } else {
        yield FitPartnerScanService.markComplete(latest);
      }
    }
  }

  // Shopify specifically requires a 200 response
  this.status = 200;
  this.body = { success: true };
}

function* resendFitLink() {
  validatePropertiesFormatted(this.request.body, {
    scanId: 'Scan ID',
    phoneNumber: 'Phone number'
  });

  const { scanId, phoneNumber } = this.request.body;

  const scan = yield ScansDAO.findById(scanId);
  this.assert(scan, 400, 'Scan not found');
  this.assert(
    scan.fitPartnerCustomerId,
    400,
    'Scan is not associated with a fit partner customer'
  );

  const customer = yield FitPartnerCustomersDAO.findById(
    scan.fitPartnerCustomerId
  );
  this.assert(customer, 400, 'Customer with associated ID not found');

  const partner = yield FitPartnersDAO.findById(customer.partnerId);
  this.assert(partner, 400, 'Partner with associated ID not found');

  const fitHost = partner.customFitDomain || Configuration.FIT_CLIENT_HOST;
  const link = `${fitHost}/scans/${scan.id}`;

  const fitCopy = substituteLink(partner.smsCopy || DEFAULT_SMS_COPY, link);
  yield Twilio.sendSMS(phoneNumber, fitCopy);

  this.status = 201;
  this.body = null;
}

router.post('/send-fit-link', sendFitLink);
router.post('/:partnerId/shopify-order-created', shopifyOrderCreated);
router.post('/resend-fit-link', resendFitLink);

module.exports = router.routes();
