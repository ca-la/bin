import createUser = require('../../test-helpers/create-user');
import EmailService = require('../email');
import generateCollection from '../../test-helpers/factories/collection';
import PartnerPayoutAccountsDAO = require('../../dao/partner-payout-accounts');
import * as PartnerPayoutLogsDAO from '../../components/partner-payouts/dao';
import StripeService = require('../stripe');
import { sandbox, test, Test } from '../../test-helpers/fresh';
import generateBid from '../../test-helpers/factories/bid';
import { addDesign } from '../../components/collections/dao';
import { payOutPartner } from '.';
import uuid = require('node-uuid');
import * as ProductDesignsDAO from '../../components/product-designs/dao';
import { findById } from '../../components/bids/dao';

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

  const design = await ProductDesignsDAO.create({
    productType: 'TEESHIRT',
    title: 'Plain White Tee',
    userId: regularUser.id
  });

  const { collection } = await generateCollection({
    createdBy: regularUser.id
  });
  await addDesign(collection.id, design.id);

  const { bid } = await generateBid({
    bidOptions: { bidPriceCents: 1000 },
    designId: design.id
  });

  const payoutAccount = await PartnerPayoutAccountsDAO.create({
    stripeAccessToken: '123',
    stripePublishableKey: '123',
    stripeRefreshToken: '123',
    stripeUserId: '123',
    userId: partnerUser.id
  });

  await payOutPartner({
    id: uuid.v4(),
    initiatorUserId: adminUser.id,
    invoiceId: null,
    message: 'Nice job!',
    payoutAccountId: payoutAccount.id,
    payoutAmountCents: 222,
    bidId: bid.id,
    isManual: false
  });

  const logs = await PartnerPayoutLogsDAO.findByPayoutAccountId(
    payoutAccount.id
  );
  t.equal(logs.length, 1);
  t.equal(logs[0].bidId, bid.id);
  t.equal(logs[0].payoutAmountCents, 222);
  t.equal(emailStub.firstCall.args[0].to, partnerUser.email);
});

test('payOutPartner requires payout account if payout is not manual', async (t: Test) => {
  const { user: adminUser } = await createUser({
    role: 'ADMIN',
    withSession: false
  });
  const { user: regularUser } = await createUser({ withSession: false });

  const design = await ProductDesignsDAO.create({
    productType: 'TEESHIRT',
    title: 'Plain White Tee',
    userId: regularUser.id
  });

  const { bid } = await generateBid({
    bidOptions: { bidPriceCents: 1000 },
    designId: design.id
  });

  try {
    await payOutPartner({
      id: uuid.v4(),
      initiatorUserId: adminUser.id,
      invoiceId: null,
      message: 'Nice job!',
      payoutAccountId: null,
      payoutAmountCents: 222,
      bidId: bid.id,
      isManual: false
    });
    t.fail(
      'non-manual payout does not fail when no payout account is provided'
    );
  } catch {
    t.pass('non-manual payout fails when no payout account is provided');
  }
});

test('payOutPartner with manual payment', async (t: Test) => {
  const { user: adminUser } = await createUser({
    role: 'ADMIN',
    withSession: false
  });
  const { user: regularUser } = await createUser({ withSession: false });

  const design = await ProductDesignsDAO.create({
    productType: 'TEESHIRT',
    title: 'Plain White Tee',
    userId: regularUser.id
  });

  const { bid } = await generateBid({
    bidOptions: { bidPriceCents: 1000 },
    designId: design.id
  });

  await payOutPartner({
    id: uuid.v4(),
    initiatorUserId: adminUser.id,
    invoiceId: null,
    message: 'Nice job!',
    payoutAccountId: null,
    payoutAmountCents: 222,
    bidId: bid.id,
    isManual: true
  });

  const foundBid = await findById(bid.id);
  if (foundBid === null) {
    t.fail('could not find bid after creation');
  } else {
    const logs = foundBid.partnerPayoutLogs;
    t.equal(logs.length, 1);
    t.equal(logs[0].bidId, bid.id);
    t.equal(logs[0].payoutAmountCents, 222);
  }
});

test('payOutPartner can pay amounts larger than bid amount', async (t: Test) => {
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

  const design = await ProductDesignsDAO.create({
    productType: 'TEESHIRT',
    title: 'Plain White Tee',
    userId: regularUser.id
  });

  const { collection } = await generateCollection({
    createdBy: regularUser.id
  });
  await addDesign(collection.id, design.id);

  const { bid } = await generateBid({
    bidOptions: { bidPriceCents: 1000 },
    designId: design.id
  });

  const payoutAccount = await PartnerPayoutAccountsDAO.create({
    stripeAccessToken: '123',
    stripePublishableKey: '123',
    stripeRefreshToken: '123',
    stripeUserId: '123',
    userId: partnerUser.id
  });

  await payOutPartner({
    id: uuid.v4(),
    initiatorUserId: adminUser.id,
    invoiceId: null,
    message: 'Nice job!',
    payoutAccountId: payoutAccount.id,
    payoutAmountCents: 1235,
    bidId: bid.id,
    isManual: false
  });

  const logs = await PartnerPayoutLogsDAO.findByPayoutAccountId(
    payoutAccount.id
  );
  t.equal(logs.length, 1);
  t.equal(logs[0].bidId, bid.id);
  t.equal(logs[0].payoutAmountCents, 1235);
  t.equal(emailStub.firstCall.args[0].to, partnerUser.email);
});
