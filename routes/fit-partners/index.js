'use strict';

const Router = require('koa-router');

const FitPartnersDAO = require('../../dao/fit-partners');
const FitPartnerCustomersDAO = require('../../dao/fit-partner-customers');
const ScansDAO = require('../../dao/scans');

const router = new Router();

// eslint-disable-next-line no-empty-function
function* sendFitLink() {
  const { partnerId, shopifyUserId } = this.request.body;
  const partner = yield FitPartnersDAO.findById(partnerId);

  this.assert(partner, 400, 'Invalid partner ID');

  const customer = yield FitPartnerCustomersDAO.findOrCreate({ partnerId, shopifyUserId });

  const scan = yield ScansDAO.create({
    fitPartnerCustomerId: customer.id,
    type: 'PHOTO'
  });
}

router.post('/send-fit-link', sendFitLink);

module.exports = router.routes();
