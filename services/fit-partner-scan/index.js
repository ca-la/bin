'use strict';

const ShopifyClient = require('../shopify');
const FitPartnersDAO = require('../../dao/fit-partners');
const FitPartnerCustomersDAO = require('../../dao/fit-partner-customers');

function constructMetafields(object) {
  const fields = [];

  Object.keys(object).forEach((key) => {
    fields.push({
      key,
      value: String(object[key]),
      value_type: 'string',
      namespace: 'cala-fit'
    });
  });

  return fields;
}

async function updateMetafields(shopify, customerId, data) {
  const currentFields = await shopify.getCustomerMetafields(customerId);

  const newFields = constructMetafields(data);

  for (const newField of newFields) {
    // If there's an existing metafield with the same key, we have to delete it
    // before setting the new value.
    const supersededField = currentFields.find(currentField =>
      newField.key === currentField.key &&
      newField.namespace === currentField.namespace
    );

    if (supersededField) {
      await shopify.deleteMetafield(supersededField.id);
    }
  }

  await shopify.updateCustomer(
    customerId,
    { metafields: constructMetafields(data) }
  );
}

async function markComplete(scan) {
  const customer = await FitPartnerCustomersDAO.findById(scan.fitPartnerCustomerId);
  const partner = await FitPartnersDAO.findById(customer.partnerId);

  const shopify = new ShopifyClient({
    storeBase: partner.shopifyHostname,
    appApiKey: partner.shopifyAppApiKey,
    appPassword: partner.shopifyAppPassword
  });

  await updateMetafields(shopify, customer.shopifyUserId, {
    'scan-complete': true,
    'scan-id': scan.id
  });
}

async function saveCalculatedValues(scan) {
  const customer = await FitPartnerCustomersDAO.findById(scan.fitPartnerCustomerId);
  const partner = await FitPartnersDAO.findById(customer.partnerId);

  const shopify = new ShopifyClient({
    storeBase: partner.shopifyHostname,
    appApiKey: partner.shopifyAppApiKey,
    appPassword: partner.shopifyAppPassword
  });

  await updateMetafields(shopify, customer.shopifyUserId, scan.measurements.calculatedValues);
}

module.exports = {
  markComplete,
  saveCalculatedValues
};
