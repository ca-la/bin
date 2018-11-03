import createUser = require('../../test-helpers/create-user');
import FitPartnerCustomersDAO = require('../../dao/fit-partner-customers');
import FitPartnerScanService = require('../../services/fit-partner-scan');
import FitPartnersDAO = require('../../dao/fit-partners');
import orderCreatePayload = require('../../test-helpers/fixtures/shopify-order-create-payload');
import ScansDAO = require('../../dao/scans');
import Twilio = require('../../services/twilio');
import { authHeader, post } from '../../test-helpers/http';
import { sandbox, test, Test } from '../../test-helpers/fresh';

test('POST /fit-partners/send-fit-link creates and sends a scan link', async (t: Test) => {
  sandbox().stub(FitPartnerScanService, 'saveFittingUrl').resolves();

  const { session, user } = await createUser();

  const partner = await FitPartnersDAO.create({
    adminUserId: user.id,
    shopifyAppApiKey: '123',
    shopifyAppPassword: '123',
    shopifyHostname: 'example.com',
    smsCopy: 'Click here: {{link}}'
  });

  const twilioStub = sandbox().stub(Twilio, 'sendSMS').resolves();

  const [response] = await post('/fit-partners/send-fit-link', {
    body: {
      partnerId: partner.id,
      phoneNumber: '+14155551234',
      shopifyUserId: 'user123'
    },
    headers: authHeader(session.id)
  });

  t.equal(response.status, 204);
  t.equal(twilioStub.callCount, 1);
  t.deepEqual(twilioStub.firstCall.args[0], '+14155551234');

  const scan = (await ScansDAO.findAll({ limit: 1, offset: 0 }))[0];
  t.equal(twilioStub.firstCall.args[1].includes(scan.id), true);
});

test(
  'POST /fit-partners/:partnerId/shopify-order-created handles a webhook payload',
  async (t: Test) => {
    sandbox().stub(FitPartnerScanService, 'saveFittingUrl').resolves();

    const { session, user } = await createUser();

    const partner = await FitPartnersDAO.create({
      adminUserId: user.id,
      shopifyAppApiKey: '123',
      shopifyAppPassword: '123',
      shopifyHostname: 'example.com',
      smsCopy: 'Click here: {{link}}'
    });

    const twilioStub = sandbox().stub(Twilio, 'sendSMS').resolves();

    const [response] = await post(`/fit-partners/${partner.id}/shopify-order-created`, {
      body: orderCreatePayload,
      headers: authHeader(session.id)
    });

    t.equal(response.status, 200);
    t.equal(twilioStub.callCount, 1);
    t.deepEqual(twilioStub.firstCall.args[0], '+14155551234');

    const scan = (await ScansDAO.findAll({ limit: 1, offset: 0 }))[0];
    t.equal(twilioStub.firstCall.args[1].includes(scan.id), true);
  }
);

test(
  'POST /fit-partners/resend-fit-link retrieves and resends a scan link',
  async (t: Test) => {
    const { session, user } = await createUser();

    const partner = await FitPartnersDAO.create({
      adminUserId: user.id,
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

    const twilioStub = sandbox().stub(Twilio, 'sendSMS').resolves();

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
  }
);
