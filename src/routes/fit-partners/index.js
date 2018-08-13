'use strict';

const Router = require('koa-router');

const FitPartnerCustomersDAO = require('../../dao/fit-partner-customers');
const FitPartnersDAO = require('../../dao/fit-partners');
const ScansDAO = require('../../dao/scans');
const Twilio = require('../../services/twilio');
const { FIT_CLIENT_HOST } = require('../../config');
const { requirePropertiesFormatted } = require('../../services/require-properties');
const { saveFittingUrl } = require('../../services/fit-partner-scan');

const router = new Router();

function substituteLink(message, link) {
  return message.replace(/{{link}}/g, link);
}

// eslint-disable-next-line no-empty-function
function* sendFitLink() {
  requirePropertiesFormatted(this.request.body, {
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

  const fitCopy = substituteLink(
    (partner.smsCopy || 'To complete your fitting, open this link on your mobile device: {{link}}'),
    link
  );

  yield saveFittingUrl(customer.id, link);

  yield Twilio.sendSMS(phoneNumber, fitCopy);

  this.status = 201;
  this.body = null;
}

router.post('/send-fit-link', sendFitLink);

module.exports = router.routes();
