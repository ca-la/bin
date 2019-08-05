import FitPartnerCustomersDAO = require('./index');
import FitPartnersDAO = require('../../dao/fit-partners');
import { test, Test } from '../../test-helpers/fresh';

test('findOrCreate finds or creates a customer', async (t: Test) => {
  const partner = await FitPartnersDAO.create({
    customFitDomain: null,
    shopifyAppApiKey: '123',
    shopifyAppPassword: '123',
    shopifyHostname: 'example.com'
  });

  const c1 = await FitPartnerCustomersDAO.findOrCreate({
    partnerId: partner.id,
    phone: '+14155555555'
  });
  const c2 = await FitPartnerCustomersDAO.findOrCreate({
    partnerId: partner.id,
    phone: '+14155555555'
  });

  t.equal(c1.id, c2.id);

  const c3 = await FitPartnerCustomersDAO.findOrCreate({
    partnerId: partner.id,
    shopifyUserId: '123'
  });
  const c4 = await FitPartnerCustomersDAO.findOrCreate({
    partnerId: partner.id,
    shopifyUserId: '123'
  });

  t.equal(c3.id, c4.id);
});

test('claimPhoneRecord updates previous phone-based customers with a new ID', async (t: Test) => {
  const partner = await FitPartnersDAO.create({
    customFitDomain: null,
    shopifyAppApiKey: '123',
    shopifyAppPassword: '123',
    shopifyHostname: 'example.com'
  });

  await FitPartnerCustomersDAO.findOrCreate({
    partnerId: partner.id,
    phone: '415 555 5555'
  });

  const updated = await FitPartnerCustomersDAO.claimPhoneRecord({
    phone: '+1 4155555555',
    shopifyUserId: '123'
  });

  t.equal(updated!.phone, null);
  t.equal(updated!.shopifyUserId, '123');
});
