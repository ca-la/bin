'use strict';

const Router = require('koa-router');

const FitPartnerCustomersDAO = require('../../dao/fit-partner-customers');
const FitPartnersDAO = require('../../dao/fit-partners');
const ScansDAO = require('../../dao/scans');
const Twilio = require('../../services/twilio');
const { FIT_CLIENT_HOST } = require('../../config');
const { validatePropertiesFormatted } = require('../../services/validate');
const { saveFittingUrl } = require('../../services/fit-partner-scan');

const router = new Router();

function substituteLink(message, link) {
  return message.replace(/{{link}}/g, link);
}

const DEFAULT_SMS_COPY = 'To complete your fitting, open this link on your mobile device: {{link}}';

// eslint-disable-next-line no-empty-function
function* sendFitLink() {
  validatePropertiesFormatted(this.request.body, {
    partnerId: 'Partner ID',
    phoneNumber: 'Phone number',
    shopifyUserId: 'Shopify User ID'
  });

  const { partnerId, phoneNumber, shopifyUserId } = this.request.body;

  const partner = yield FitPartnersDAO.findById(partnerId);

  this.assert(partner, 400, 'Invalid partner ID');

  const customer = yield FitPartnerCustomersDAO.findOrCreate({ partnerId, shopifyUserId });

  const scan = yield ScansDAO.create({
    fitPartnerCustomerId: customer.id,
    type: 'PHOTO'
  });

  const fitHost = partner.customFitDomain || FIT_CLIENT_HOST;
  const link = `${fitHost}/scans/${scan.id}`;

  const fitCopy = substituteLink(partner.smsCopy || DEFAULT_SMS_COPY, link);

  yield saveFittingUrl(customer.id, link);

  yield Twilio.sendSMS(phoneNumber, fitCopy);

  this.status = 201;
  this.body = null;
}

function* resendFitLink() {
  validatePropertiesFormatted(this.request.body, {
    scanId: 'Scan ID',
    phoneNumber: 'Phone number'
  });

  const { scanId, phoneNumber } = this.request.body;

  const scan = yield ScansDAO.findById(scanId);
  this.assert(scan, 400, 'Scan not found');
  this.assert(scan.fitPartnerCustomerId, 400, 'Scan is not associated with a fit partner customer');

  const customer = yield FitPartnerCustomersDAO.findById(scan.fitPartnerCustomerId);
  this.assert(customer, 400, 'Customer with associated ID not found');

  const partner = yield FitPartnersDAO.findById(customer.partnerId);
  this.assert(partner, 400, 'Partner with associated ID not found');

  const fitHost = partner.customFitDomain || FIT_CLIENT_HOST;
  const link = `${fitHost}/scans/${scan.id}`;

  const fitCopy = substituteLink(partner.smsCopy || DEFAULT_SMS_COPY, link);
  yield Twilio.sendSMS(phoneNumber, fitCopy);

  this.status = 201;
  this.body = null;
}

router.post('/send-fit-link', sendFitLink);
router.post('/resend-fit-link', resendFitLink);

module.exports = router.routes();
