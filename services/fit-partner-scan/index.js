'use strict';

const ShopifyClient = require('../shopify');
const FitPartnersDAO = require('../../dao/fit-partners');
const FitPartnerCustomersDAO = require('../../dao/fit-partner-customers');

function constructMetafields(object) {
  const fields = [];

  Object.keys(object).forEach((key) => {
    fields.push({
      key: `cala-${key}`,
      value: String(object[key]),
      value_type: 'string',
      namespace: 'global'
    });
  });

  return fields;
}

async function markComplete(scan) {
  const customer = await FitPartnerCustomersDAO.findById(scan.fitPartnerCustomerId);
  const partner = await FitPartnersDAO.findById(customer.partnerId);

  const shopify = new ShopifyClient({
    storeBase: partner.shopifyHostname,
    appApiKey: partner.shopifyAppApiKey,
    appPassword: partner.shopifyAppPassword
  });

  await shopify.updateCustomer(
    customer.shopifyUserId,
    { metafields: constructMetafields({ scanComplete: true }) }
  );
}

async function saveCalculatedValues(scan) {
  const customer = await FitPartnerCustomersDAO.findById(scan.fitPartnerCustomerId);
  const partner = await FitPartnersDAO.findById(customer.partnerId);

  const shopify = new ShopifyClient({
    storeBase: partner.shopifyHostname,
    appApiKey: partner.shopifyAppApiKey,
    appPassword: partner.shopifyAppPassword
  });

  await shopify.updateCustomer(
    customer.shopifyUserId,
    { metafields: constructMetafields(scan.measurements.calculatedValues) }
  );
}

module.exports = {
  markComplete,
  saveCalculatedValues
};
