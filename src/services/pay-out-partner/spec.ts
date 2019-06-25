import * as Knex from 'knex';

import createUser = require('../../test-helpers/create-user');
import db = require('../db');
import EmailService = require('../email');
import generateCollection from '../../test-helpers/factories/collection';
import Invoice from '../../domain-objects/invoice';
import InvoicesDAO = require('../../dao/invoices');
import PartnerPayoutAccountsDAO = require('../../dao/partner-payout-accounts');
import * as PartnerPayoutLogsDAO from '../../components/partner-payouts/dao';
import payOutPartner = require('./index');
import StripeService = require('../stripe');
import { sandbox, test, Test } from '../../test-helpers/fresh';

test('payOutPartner', async (t: Test) => {
  const emailStub = sandbox()
    .stub(EmailService, 'enqueueSend')
    .resolves();
  sandbox()
    .stub(StripeService, 'sendTransfer')
    .resolves();

  const { user: adminUser } = await createUser({
    role: 'ADMIN',
    withSession: false
  });
  const { user: regularUser } = await createUser({ withSession: false });
  const { user: partnerUser } = await createUser({
    role: 'PARTNER',
    withSession: false
  });

  const { collection } = await generateCollection();

  let invoice: Invoice;

  await db.transaction(async (trx: Knex.Transaction) => {
    invoice = await InvoicesDAO.createTrx(trx, {
      collectionId: collection.id,
      title: 'My First Invoice',
      totalCents: 1234,
      userId: regularUser.id
    });
  });

  const payoutAccount = await PartnerPayoutAccountsDAO.create({
    stripeAccessToken: '123',
    stripePublishableKey: '123',
    stripeRefreshToken: '123',
    stripeUserId: '123',
    userId: partnerUser.id
  });

  await payOutPartner({
    initiatorUserId: adminUser.id,
    invoiceId: invoice!.id,
    message: 'Nice job!',
    payoutAccountId: payoutAccount.id,
    payoutAmountCents: 222
  });

  const logs = await PartnerPayoutLogsDAO.findByPayoutAccountId(
    payoutAccount.id
  );
  t.equal(logs.length, 1);
  t.equal(logs[0].invoiceId, invoice!.id);
  t.equal(logs[0].payoutAmountCents, 222);
  t.equal(emailStub.firstCall.args[0].to, partnerUser.email);
});

test('payOutPartner can pay amounts larger than invoice amount', async (t: Test) => {
  const emailStub = sandbox()
    .stub(EmailService, 'enqueueSend')
    .resolves();
  sandbox()
    .stub(StripeService, 'sendTransfer')
    .resolves();

  const { user: adminUser } = await createUser({
    role: 'ADMIN',
    withSession: false
  });
  const { user: regularUser } = await createUser({ withSession: false });
  const { user: partnerUser } = await createUser({
    role: 'PARTNER',
    withSession: false
  });

  const { collection } = await generateCollection();

  let invoice: Invoice;

  await db.transaction(async (trx: Knex.Transaction) => {
    invoice = await InvoicesDAO.createTrx(trx, {
      collectionId: collection.id,
      title: 'My First Invoice',
      totalCents: 1234,
      userId: regularUser.id
    });
  });

  const payoutAccount = await PartnerPayoutAccountsDAO.create({
    stripeAccessToken: '123',
    stripePublishableKey: '123',
    stripeRefreshToken: '123',
    stripeUserId: '123',
    userId: partnerUser.id
  });

  await payOutPartner({
    initiatorUserId: adminUser.id,
    invoiceId: invoice!.id,
    message: 'Nice job!',
    payoutAccountId: payoutAccount.id,
    payoutAmountCents: 1235
  });

  const logs = await PartnerPayoutLogsDAO.findByPayoutAccountId(
    payoutAccount.id
  );
  t.equal(logs.length, 1);
  t.equal(logs[0].invoiceId, invoice!.id);
  t.equal(logs[0].payoutAmountCents, 1235);
  t.equal(emailStub.firstCall.args[0].to, partnerUser.email);
});
