import ShopifyClient = require('../shopify');
import FitPartnersDAO = require('../../dao/fit-partners');
import FitPartnerCustomersDAO = require('../../dao/fit-partner-customers');
import Scan = require('../../domain-objects/scan');
import FitPartnerCustomer from '../../domain-objects/fit-partner-customer';

type ShopifyMetafieldDefinition = ShopifyClient.ShopifyMetafieldDefinition;

type UnsavedMetafield = Omit<ShopifyMetafieldDefinition, 'id'>;

// We can store any arbitrary data in Shopify metafields
interface Data { [key: string]: any; }

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

async function updateMetafields(
  shopify: ShopifyClient,
  customerId: string,
  data: Data
): Promise<void> {
  const currentFields = await shopify.getCustomerMetafields(customerId);

  const newFields = constructMetafields(data);

  for (const newField of newFields) {
    // If there's an existing metafield with the same key, we have to delete it
    // before setting the new value.
    const supersededField = currentFields.find((currentField: ShopifyMetafieldDefinition) =>
      newField.key === currentField.key &&
      newField.namespace === currentField.namespace);

    if (supersededField) {
      await shopify.deleteMetafield(supersededField.id);
    }
  }

  await shopify.updateCustomer(
    customerId,
    { metafields: constructMetafields(data) }
  );
}

async function getShopifyClient(scan: Scan): Promise<{
  shopify: ShopifyClient,
  customer: FitPartnerCustomer
}> {
  if (!scan.fitPartnerCustomerId) { throw new Error(`No customer ID on scan ${scan.id}`); }

  const customer = await FitPartnerCustomersDAO.findById(scan.fitPartnerCustomerId);
  if (!customer) {
    throw new Error(`Customer ${scan.fitPartnerCustomerId} not found for scan ${scan.id}`);
  }

  const partner = await FitPartnersDAO.findById(customer.partnerId);
  if (!partner) {
    throw new Error(`Partner ${customer.partnerId} not found for customer ${customer.id}`);
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

  await updateMetafields(shopify, customer.shopifyUserId, scan.measurements.calculatedValues);
}

export async function saveFittingUrl(customerId: string, fittingUrl: string): Promise<void> {
  const customer = await FitPartnerCustomersDAO.findById(customerId);
  if (!customer) { throw new Error(`Customer not found: ${customerId}`); }

  const partner = await FitPartnersDAO.findById(customer.partnerId);
  if (!partner) {
    throw new Error(`Partner ${customer.partnerId} not found for customer ${customer.id}`);
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
