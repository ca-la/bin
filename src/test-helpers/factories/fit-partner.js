'use strict';

const FitPartnersDAO = require('../../dao/fit-partners');

function createFitPartner({ adminUserId }) {
  return FitPartnersDAO.create({
    shopifyHostname: 'http://example.com',
    shopifyAppApiKey: '123123',
    shopifyAppPassword: '123123',
    adminUserId
  });
}

module.exports = createFitPartner;
