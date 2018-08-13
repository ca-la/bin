import FitPartnerCustomersDAO = require('../../dao/fit-partner-customers');
import FitPartnersDAO = require('../../dao/fit-partners');
import ShopifyClient = require('../shopify');
import { saveFittingUrl } from '.';
import { sandbox, test, Test } from '../../test-helpers/fresh';

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
