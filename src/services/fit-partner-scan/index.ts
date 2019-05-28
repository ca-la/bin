import { chunk } from 'lodash';
import { Transaction } from 'knex';

import FitPartnerCustomer = require('../../domain-objects/fit-partner-customer');
import FitPartnerCustomersDAO = require('../../dao/fit-partner-customers');
import FitPartnersDAO = require('../../dao/fit-partners');
import Scan = require('../../domain-objects/scan');
import ShopifyClient = require('../shopify');
import db = require('../../services/db');

type ShopifyMetafieldDefinition = ShopifyClient.ShopifyMetafieldDefinition;

type UnsavedMetafield = Omit<ShopifyMetafieldDefinition, 'id'>;

// We can store any arbitrary data in Shopify metafields
interface Data {
  [key: string]: any;
}

function constructMetafields(data: Data): UnsavedMetafield[] {
  const fields: UnsavedMetafield[] = [];

  Object.keys(data).forEach((key: string) => {
    // Shopify limits key names to a max of 30 characters
    const truncatedKey = key.slice(0, 30);

    fields.push({
      key: truncatedKey,
      namespace: 'cala-fit',
      value: String(data[key]),
      value_type: 'string'
    });
  });

  return fields;
}

// Shopify has an undocumented limit on the number of metafields you can save at
// one time. We've seen numbers as high as 70+ work successfully, but other
// amounts in the 50-80 range silently failing. This is a bug on their end that
// they're unwilling to address; in the interim, we divide the new fields into
// several requests.
const METAFIELDS_PER_REQUEST = 30;

async function updateMetafields(
  shopify: ShopifyClient,
  customerId: string,
  data: Data
): Promise<void> {
  return db.transaction(async (trx: Transaction) => {
    // We acquire an update lock on the relevant fit_partner_customer to ensure
    // that we're not tripping over each other and deleting old values at the
    // same time we're saving new ones.

    // Using `as any` coercion to avoid
    // https://github.com/DefinitelyTyped/DefinitelyTyped/issues/28679 — TODO
    // remove when fixed
    await (db.raw(
      'select * from fit_partner_customers where shopify_user_id = ? for update',
      [customerId]
    ) as any).transacting(trx);

    const currentFields = await shopify.getCustomerMetafields(customerId);

    const newFields = constructMetafields(data);

    for (const newField of newFields) {
      // If there's an existing metafield with the same key, we have to delete it
      // before setting the new value.
      const supersededField = currentFields.find(
        (currentField: ShopifyMetafieldDefinition) =>
          newField.key === currentField.key &&
          newField.namespace === currentField.namespace
      );

      if (supersededField) {
        await shopify.deleteMetafield(supersededField.id);
      }
    }

    const metafields = constructMetafields(data);
    const fieldChunks = chunk(metafields, METAFIELDS_PER_REQUEST);

    for (const fieldSubset of fieldChunks) {
      await shopify.updateCustomer(customerId, { metafields: fieldSubset });
    }
  });
}

async function getShopifyClient(
  scan: Scan
): Promise<{
  shopify: ShopifyClient;
  customer: FitPartnerCustomer;
}> {
  if (!scan.fitPartnerCustomerId) {
    throw new Error(`No customer ID on scan ${scan.id}`);
  }

  const customer = await FitPartnerCustomersDAO.findById(
    scan.fitPartnerCustomerId
  );
  if (!customer) {
    throw new Error(
      `Customer ${scan.fitPartnerCustomerId} not found for scan ${scan.id}`
    );
  }

  const partner = await FitPartnersDAO.findById(customer.partnerId);
  if (!partner) {
    throw new Error(
      `Partner ${customer.partnerId} not found for customer ${customer.id}`
    );
  }

  const shopify = new ShopifyClient({
    appApiKey: partner.shopifyAppApiKey,
    appPassword: partner.shopifyAppPassword,
    storeBase: partner.shopifyHostname
  });

  return { shopify, customer };
}

export async function markComplete(scan: Scan): Promise<void> {
  const { shopify, customer } = await getShopifyClient(scan);

  await updateMetafields(shopify, customer.shopifyUserId, {
    'scan-complete': true,
    'scan-id': scan.id
  });
}

export async function saveCalculatedValues(scan: Scan): Promise<void> {
  const { shopify, customer } = await getShopifyClient(scan);

  if (!scan.measurements || !scan.measurements.calculatedValues) {
    throw new Error(`Missing calculated values on scan ${scan.id}`);
  }

  await updateMetafields(
    shopify,
    customer.shopifyUserId,
    scan.measurements.calculatedValues
  );
}

export async function saveFittingUrl(
  customerId: string,
  fittingUrl: string
): Promise<void> {
  const customer = await FitPartnerCustomersDAO.findById(customerId);
  if (!customer) {
    throw new Error(`Customer not found: ${customerId}`);
  }

  const partner = await FitPartnersDAO.findById(customer.partnerId);
  if (!partner) {
    throw new Error(
      `Partner ${customer.partnerId} not found for customer ${customer.id}`
    );
  }

  const shopify = new ShopifyClient({
    appApiKey: partner.shopifyAppApiKey,
    appPassword: partner.shopifyAppPassword,
    storeBase: partner.shopifyHostname
  });

  await updateMetafields(shopify, customer.shopifyUserId, {
    'latest-fitting-url': fittingUrl
  });
}
