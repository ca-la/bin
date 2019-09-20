'use strict';

const uuid = require('node-uuid');
const createUser = require('../../test-helpers/create-user');
const db = require('../../services/db');
const InvoicesDAO = require('../../dao/invoices');
const generateCollection = require('../../test-helpers/factories/collection')
  .default;
const { authHeader, get, post } = require('../../test-helpers/http');
const EmailService = require('../../services/email');
const StripeService = require('../../services/stripe');
const ProductDesignsDAO = require('../../components/product-designs/dao');
const PartnerPayoutLogsDAO = require('../../components/partner-payouts/dao');
const PartnerPayoutAccountsDAO = require('../../dao/partner-payout-accounts');
const { sandbox, test } = require('../../test-helpers/fresh');
const generateInvoice = require('../../test-helpers/factories/invoice').default;
const { addDesign } = require('../../components/collections/dao');

test('GET /invoices allows admins to list invoices for a collection', async t => {
  const { user } = await createUser({ withSession: false });
  const { session: adminSession } = await createUser({ role: 'ADMIN' });

  const { collection } = await generateCollection({ userId: user.id });

  await db.transaction(async trx => {
    await InvoicesDAO.createTrx(trx, {
      collectionId: collection.id,
      totalCents: 1234,
      title: 'My First Invoice'
    });
  });

  const [response, body] = await get(
    `/invoices?collectionId=${collection.id}`,
    {
      headers: authHeader(adminSession.id)
    }
  );

  t.equal(response.status, 200);
  t.equal(body.length, 1);
  t.equal(body[0].collectionId, collection.id);
  t.equal(body[0].totalCents, 1234);
});

test('GET /invoices lists invoices belonging to a given user', async t => {
  const { session, user } = await createUser();

  const { collection } = await generateCollection({ userId: user.id });

  await db.transaction(async trx => {
    await InvoicesDAO.createTrx(trx, {
      userId: user.id,
      collectionId: collection.id,
      totalCents: 1234,
      title: 'My First Invoice'
    });
  });

  const [response, body] = await get(`/invoices?userId=${user.id}`, {
    headers: authHeader(session.id)
  });

  t.equal(response.status, 200);
  t.equal(body.length, 1);
  t.equal(body[0].collectionId, collection.id);
  t.equal(body[0].totalCents, 1234);
});

test('payout an invoice', async t => {
  const emailStub = sandbox()
    .stub(EmailService, 'enqueueSend')
    .resolves();
  sandbox()
    .stub(StripeService, 'sendTransfer')
    .resolves();

  const { session } = await createUser({
    role: 'ADMIN'
  });
  const { user: regularUser } = await createUser({ withSession: false });
  const { user: partnerUser } = await createUser({
    role: 'PARTNER',
    withSession: false
  });

  const design = await ProductDesignsDAO.create({
    productType: 'TEESHIRT',
    title: 'Plain White Tee',
    userId: regularUser.id
  });

  const { collection } = await generateCollection({
    createdBy: regularUser.id
  });
  await addDesign(collection.id, design.id);

  const { invoice } = await generateInvoice({
    collectionId: collection.id,
    userId: regularUser.id
  });

  const payoutAccount = await PartnerPayoutAccountsDAO.create({
    stripeAccessToken: '123',
    stripePublishableKey: '123',
    stripeRefreshToken: '123',
    stripeUserId: '123',
    userId: partnerUser.id
  });

  const [response] = await post(`/invoices/${invoice.id}/pay-out-to-partner`, {
    headers: authHeader(session.id),
    body: {
      id: uuid.v4(),
      invoiceId: invoice.id,
      message: 'Nice job!',
      payoutAccountId: payoutAccount.id,
      payoutAmountCents: 222
    }
  });
  t.equal(response.status, 204);

  const logs = await PartnerPayoutLogsDAO.findByPayoutAccountId(
    payoutAccount.id
  );
  t.equal(logs.length, 1);
  t.equal(logs[0].invoiceId, invoice.id);
  t.equal(logs[0].payoutAmountCents, 222);
  t.equal(emailStub.firstCall.args[0].to, partnerUser.email);
});
