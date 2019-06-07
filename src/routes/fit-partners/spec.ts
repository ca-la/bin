import { cloneDeep, omit } from 'lodash';

import * as Configuration from '../../config';
import createUser = require('../../test-helpers/create-user');
import FitPartnerCustomersDAO = require('../../dao/fit-partner-customers');
import FitPartnerScanService = require('../../services/fit-partner-scan');
import FitPartnersDAO = require('../../dao/fit-partners');
import orderCreatePayload from '../../test-helpers/fixtures/shopify-order-create-payload';
import ScansDAO = require('../../dao/scans');
import Twilio = require('../../services/twilio');
import { authHeader, post } from '../../test-helpers/http';
import { sandbox, test, Test } from '../../test-helpers/fresh';

test('POST /fit-partners/send-fit-link creates and sends a scan link', async (t: Test) => {
  sandbox()
    .stub(FitPartnerScanService, 'saveFittingUrl')
    .resolves();

  const { session, user } = await createUser();

  const partner = await FitPartnersDAO.create({
    adminUserId: user.id,
    customFitDomain: null,
    shopifyAppApiKey: '123',
    shopifyAppPassword: '123',
    shopifyHostname: 'example.com',
    smsCopy: 'Click here: {{link}}'
  });

  const twilioStub = sandbox()
    .stub(Twilio, 'sendSMS')
    .resolves();

  const [response] = await post('/fit-partners/send-fit-link', {
    body: {
      partnerId: partner.id,
      phoneNumber: '+14155551234',
      shopifyUserId: 'user123'
    },
    headers: authHeader(session.id)
  });

  t.equal(response.status, 201);
  t.equal(twilioStub.callCount, 1);
  t.deepEqual(twilioStub.firstCall.args[0], '+14155551234');

  const scan = (await ScansDAO.findAll({ limit: 1, offset: 0 }))[0];
  t.equal(twilioStub.firstCall.args[1].includes(scan.id), true);
});

test('POST /fit-partners/send-fit-link creates and sends a scan link without shopify user', async (t: Test) => {
  sandbox()
    .stub(FitPartnerScanService, 'saveFittingUrl')
    .resolves();

  const { session, user } = await createUser();

  const partner = await FitPartnersDAO.create({
    adminUserId: user.id,
    customFitDomain: null,
    shopifyAppApiKey: '123',
    shopifyAppPassword: '123',
    shopifyHostname: 'example.com',
    smsCopy: 'Click here: {{link}}'
  });

  const twilioStub = sandbox()
    .stub(Twilio, 'sendSMS')
    .resolves();

  const [response] = await post('/fit-partners/send-fit-link', {
    body: {
      partnerId: partner.id,
      phoneNumber: '+14155551234'
    },
    headers: authHeader(session.id)
  });

  t.equal(response.status, 201);
  t.equal(twilioStub.callCount, 1);
  t.deepEqual(twilioStub.firstCall.args[0], '+14155551234');

  const scan = (await ScansDAO.findAll({ limit: 1, offset: 0 }))[0];
  t.equal(twilioStub.firstCall.args[1].includes(scan.id), true);
});

test('POST /fit-partners/:partnerId/shopify-order-created handles a webhook payload', async (t: Test) => {
  sandbox()
    .stub(FitPartnerScanService, 'saveFittingUrl')
    .resolves();
  sandbox()
    .stub(Configuration, 'FIT_PARTNER_SMS_PRODUCT_ID_BLACKLIST')
    .value([111, 222, 444, 6789]);

  const { session, user } = await createUser();

  const partner = await FitPartnersDAO.create({
    adminUserId: user.id,
    customFitDomain: null,
    shopifyAppApiKey: '123',
    shopifyAppPassword: '123',
    shopifyHostname: 'example.com',
    smsCopy: 'Click here: {{link}}'
  });

  const twilioStub = sandbox()
    .stub(Twilio, 'sendSMS')
    .resolves();

  const smsProduct = cloneDeep(orderCreatePayload);
  smsProduct.line_items[0].product_id = 12345;

  const [response] = await post(
    `/fit-partners/${partner.id}/shopify-order-created`,
    {
      body: smsProduct,
      headers: authHeader(session.id)
    }
  );

  t.equal(response.status, 200);
  t.equal(twilioStub.callCount, 1);
  t.deepEqual(twilioStub.firstCall.args[0], '+14155551234');

  const scan = (await ScansDAO.findAll({ limit: 1, offset: 0 }))[0];
  t.equal(twilioStub.firstCall.args[1].includes(scan.id), true);
});

test('POST /fit-partners/:partnerId/shopify-order-created claims old customers', async (t: Test) => {
  sandbox()
    .stub(FitPartnerScanService, 'saveFittingUrl')
    .resolves();

  const { session, user } = await createUser();

  const partner = await FitPartnersDAO.create({
    adminUserId: user.id,
    customFitDomain: null,
    shopifyAppApiKey: '123',
    shopifyAppPassword: '123',
    shopifyHostname: 'example.com',
    smsCopy: 'Click here: {{link}}'
  });

  const phoneCustomer = await FitPartnerCustomersDAO.findOrCreate({
    partnerId: partner.id,
    phone: '+14155551234'
  });

  sandbox()
    .stub(Twilio, 'sendSMS')
    .resolves();

  const smsProduct = cloneDeep(orderCreatePayload);
  smsProduct.line_items[0].product_id = 12345;

  await post(`/fit-partners/${partner.id}/shopify-order-created`, {
    body: smsProduct,
    headers: authHeader(session.id)
  });

  const updatedPhoneCustomer = await FitPartnerCustomersDAO.findById(
    phoneCustomer.id
  );
  if (!updatedPhoneCustomer) {
    throw new Error('Missing customer');
  }

  t.equal(updatedPhoneCustomer.phone, null);
  t.equal(updatedPhoneCustomer.shopifyUserId, '4567143233');
});

test(// tslint:disable-next-line:max-line-length
'POST /fit-partners/:partnerId/shopify-order-created does nothing if all products in the order are blacklisted', async (t: Test) => {
  sandbox()
    .stub(FitPartnerScanService, 'saveFittingUrl')
    .resolves();
  sandbox()
    .stub(Configuration, 'FIT_PARTNER_SMS_PRODUCT_ID_BLACKLIST')
    .value([11, 22, 123, 12345, 456]);

  const { session, user } = await createUser();

  const partner = await FitPartnersDAO.create({
    adminUserId: user.id,
    customFitDomain: null,
    shopifyAppApiKey: '123',
    shopifyAppPassword: '123',
    shopifyHostname: 'example.com',
    smsCopy: 'Click here: {{link}}'
  });

  const twilioStub = sandbox()
    .stub(Twilio, 'sendSMS')
    .resolves();

  const nonSmsProduct = cloneDeep(orderCreatePayload);
  nonSmsProduct.line_items[0].product_id = 12345;

  const [response] = await post(
    `/fit-partners/${partner.id}/shopify-order-created`,
    {
      body: nonSmsProduct,
      headers: authHeader(session.id)
    }
  );

  t.equal(response.status, 200);
  t.equal(twilioStub.callCount, 0);
});

test(// tslint:disable-next-line:max-line-length
'POST /fit-partners/:partnerId/shopify-order-created still sends a fit link if some but not all products are blacklisted', async (t: Test) => {
  sandbox()
    .stub(FitPartnerScanService, 'saveFittingUrl')
    .resolves();
  sandbox()
    .stub(Configuration, 'FIT_PARTNER_SMS_PRODUCT_ID_BLACKLIST')
    .value([11, 22, 123, 12345, 456]);

  const { session, user } = await createUser();

  const partner = await FitPartnersDAO.create({
    adminUserId: user.id,
    customFitDomain: null,
    shopifyAppApiKey: '123',
    shopifyAppPassword: '123',
    shopifyHostname: 'example.com',
    smsCopy: 'Click here: {{link}}'
  });

  const twilioStub = sandbox()
    .stub(Twilio, 'sendSMS')
    .resolves();

  const nonSmsProduct = cloneDeep(orderCreatePayload);
  nonSmsProduct.line_items[0].product_id = 12345;
  nonSmsProduct.line_items[1] = cloneDeep(nonSmsProduct.line_items[0]);
  nonSmsProduct.line_items[1].product_id = 999;

  const [response] = await post(
    `/fit-partners/${partner.id}/shopify-order-created`,
    {
      body: nonSmsProduct,
      headers: authHeader(session.id)
    }
  );

  t.equal(response.status, 200);
  t.equal(twilioStub.callCount, 1);
  t.deepEqual(twilioStub.firstCall.args[0], '+14155551234');

  const scan = (await ScansDAO.findAll({ limit: 1, offset: 0 }))[0];
  t.equal(twilioStub.firstCall.args[1].includes(scan.id), true);
});

test('POST /fit-partners/:partnerId/shopify-order-created missing shipping address warns and skips', async (t: Test) => {
  sandbox()
    .stub(FitPartnerScanService, 'saveFittingUrl')
    .resolves();

  const { session, user } = await createUser();

  const partner = await FitPartnersDAO.create({
    adminUserId: user.id,
    customFitDomain: null,
    shopifyAppApiKey: '123',
    shopifyAppPassword: '123',
    shopifyHostname: 'example.com',
    smsCopy: 'Click here: {{link}}'
  });

  const twilioStub = sandbox()
    .stub(Twilio, 'sendSMS')
    .resolves();

  const [response] = await post(
    `/fit-partners/${partner.id}/shopify-order-created`,
    {
      body: omit(orderCreatePayload, ['shipping_address']),
      headers: authHeader(session.id)
    }
  );

  t.equal(response.status, 200);
  t.equal(twilioStub.callCount, 0);

  const scans = await ScansDAO.findAll({ limit: 1, offset: 0 });
  t.deepEqual(scans, []);
});

test('POST /fit-partners/resend-fit-link retrieves and resends a scan link', async (t: Test) => {
  const { session, user } = await createUser();

  const partner = await FitPartnersDAO.create({
    adminUserId: user.id,
    customFitDomain: null,
    shopifyAppApiKey: '123',
    shopifyAppPassword: '123',
    shopifyHostname: 'example.com',
    smsCopy: 'Click here: {{link}}'
  });

  const customer = await FitPartnerCustomersDAO.findOrCreate({
    partnerId: partner.id,
    shopifyUserId: 'shopify-user-123'
  });

  const scan = await ScansDAO.create({
    fitPartnerCustomerId: customer.id,
    type: 'PHOTO'
  });

  const twilioStub = sandbox()
    .stub(Twilio, 'sendSMS')
    .resolves();

  const [response] = await post('/fit-partners/resend-fit-link', {
    body: {
      phoneNumber: '+14155551234',
      scanId: scan.id
    },
    headers: authHeader(session.id)
  });

  t.equal(response.status, 204);
  t.equal(twilioStub.callCount, 1);
  t.deepEqual(twilioStub.firstCall.args[0], '+14155551234');
  t.equal(twilioStub.firstCall.args[1].includes(scan.id), true);
});
