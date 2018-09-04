import FitPartnerCustomersDAO = require('../../dao/fit-partner-customers');
import FitPartnersDAO = require('../../dao/fit-partners');
import Scan = require('../../domain-objects/scan');
import ShopifyClient = require('../shopify');
import { sandbox, test, Test } from '../../test-helpers/fresh';
import { saveCalculatedValues, saveFittingUrl } from './index';

test('saveFittingUrl saves correct URL to Shopify customer data', async (t: Test) => {
  const partner = await FitPartnersDAO.create({
    shopifyAppApiKey: '123',
    shopifyAppPassword: '123',
    shopifyHostname: 'example.com'
  });

  const customer = await FitPartnerCustomersDAO.findOrCreate({
    partnerId: partner.id,
    shopifyUserId: 'shopify-user-123'
  });

  sandbox().stub(ShopifyClient.prototype, 'getCustomerMetafields')
    .returns(Promise.resolve([]));

  const updateStub = sandbox().stub(ShopifyClient.prototype, 'updateCustomer')
    .returns(Promise.resolve());

  await saveFittingUrl(customer.id, 'http://example.com');

  t.equal(updateStub.callCount, 1);
  t.deepEqual(updateStub.firstCall.args, [
    'shopify-user-123',
    {
      metafields: [
        {
          key: 'latest-fitting-url',
          namespace: 'cala-fit',
          value: 'http://example.com',
          value_type: 'string'
        }
      ]
    }
  ]);
});

test('saveCalculatedValues truncates key names to 30 characters', async (t: Test) => {
  const partner = await FitPartnersDAO.create({
    shopifyAppApiKey: '123',
    shopifyAppPassword: '123',
    shopifyHostname: 'example.com'
  });

  const customer = await FitPartnerCustomersDAO.findOrCreate({
    partnerId: partner.id,
    shopifyUserId: 'shopify-user-123'
  });

  sandbox().stub(ShopifyClient.prototype, 'getCustomerMetafields')
    .returns(Promise.resolve([]));

  const updateStub = sandbox().stub(ShopifyClient.prototype, 'updateCustomer')
    .returns(Promise.resolve());

  const scanStub = new Scan({ id: '123' });
  scanStub.measurements = {
    calculatedValues: {
      '123456789012345678901234567890-very-long-key': 42,
      'regular-key': 123
    }
  };

  scanStub.fitPartnerCustomerId = customer.id;

  await saveCalculatedValues(scanStub);

  t.equal(updateStub.callCount, 1);
  t.deepEqual(updateStub.firstCall.args, [
    'shopify-user-123',
    {
      metafields: [
        {
          key: '123456789012345678901234567890',
          namespace: 'cala-fit',
          value: '42',
          value_type: 'string'
        },
        {
          key: 'regular-key',
          namespace: 'cala-fit',
          value: '123',
          value_type: 'string'
        }
      ]
    }
  ]);
});

test('saveCalculatedValues batches keys into groups', async (t: Test) => {
  const partner = await FitPartnersDAO.create({
    shopifyAppApiKey: '123',
    shopifyAppPassword: '123',
    shopifyHostname: 'example.com'
  });

  const customer = await FitPartnerCustomersDAO.findOrCreate({
    partnerId: partner.id,
    shopifyUserId: 'shopify-user-123'
  });

  sandbox().stub(ShopifyClient.prototype, 'getCustomerMetafields')
    .returns(Promise.resolve([]));

  const updateStub = sandbox().stub(ShopifyClient.prototype, 'updateCustomer')
    .returns(Promise.resolve());

  const scanStub = new Scan({ id: '123' });
  scanStub.measurements = { calculatedValues: {} };

  for (let i = 1; i <= 100; i += 1) {
    scanStub.measurements.calculatedValues![`measurement-${i}`] = 1234;
  }

  scanStub.fitPartnerCustomerId = customer.id;

  await saveCalculatedValues(scanStub);

  t.equal(updateStub.callCount, 4);
  t.equal(updateStub.args[0][1].metafields.length, 30);
  t.equal(updateStub.args[1][1].metafields.length, 30);
  t.equal(updateStub.args[2][1].metafields.length, 30);
  t.equal(updateStub.args[3][1].metafields.length, 10);
});
