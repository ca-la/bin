import Knex from "knex";
import uuid from "node-uuid";

import createUser = require("../../test-helpers/create-user");
import EmailService = require("../email");
import generateCollection from "../../test-helpers/factories/collection";
import PartnerPayoutAccountsDAO = require("../../dao/partner-payout-accounts");
import * as PartnerPayoutLogsDAO from "../../components/partner-payouts/dao";
import StripeService = require("../stripe");
import db from "../db";
import { sandbox, test, Test } from "../../test-helpers/fresh";
import generateBid from "../../test-helpers/factories/bid";
import { addDesign } from "../../test-helpers/collections";
import { payOutPartner } from ".";
import ProductDesignsDAO from "../../components/product-designs/dao";

test("payOutPartner", async (t: Test) => {
  const emailStub = sandbox().stub(EmailService, "enqueueSend").resolves();
  sandbox().stub(StripeService, "sendTransfer").resolves();

  const { user: adminUser } = await createUser({
    role: "ADMIN",
    withSession: false,
  });
  const { user: regularUser } = await createUser({ withSession: false });
  const { user: partnerUser } = await createUser({
    role: "PARTNER",
    withSession: false,
  });

  const design = await ProductDesignsDAO.create({
    productType: "TEESHIRT",
    title: "Plain White Tee",
    userId: regularUser.id,
  });

  const { collection } = await generateCollection({
    createdBy: regularUser.id,
  });
  await addDesign(collection.id, design.id);

  const { bid } = await generateBid({
    bidOptions: { bidPriceCents: 1000 },
    designId: design.id,
  });

  const payoutAccount = await PartnerPayoutAccountsDAO.create({
    id: uuid.v4(),
    createdAt: new Date(),
    deletedAt: null,
    stripeAccessToken: "123",
    stripePublishableKey: "123",
    stripeRefreshToken: "123",
    stripeUserId: "123",
    userId: partnerUser.id,
  });

  const trx = await db.transaction();
  try {
    await payOutPartner(trx, {
      id: uuid.v4(),
      initiatorUserId: adminUser.id,
      invoiceId: null,
      message: "Nice job!",
      payoutAccountId: payoutAccount.id,
      payoutAmountCents: 222,
      bidId: bid.id,
      isManual: false,
    });

    const logs = await PartnerPayoutLogsDAO.findByPayoutAccountId(
      trx,
      payoutAccount.id
    );
    t.equal(logs.length, 1);
    t.equal(logs[0].bidId, bid.id);
    t.equal(logs[0].payoutAmountCents, 222);
    t.equal(emailStub.firstCall.args[0].to, partnerUser.email);
  } finally {
    await trx.rollback();
  }
});

test("payOutPartner requires payout account if payout is not manual", async (t: Test) => {
  const { user: adminUser } = await createUser({
    role: "ADMIN",
    withSession: false,
  });
  const { user: regularUser } = await createUser({ withSession: false });

  const design = await ProductDesignsDAO.create({
    productType: "TEESHIRT",
    title: "Plain White Tee",
    userId: regularUser.id,
  });

  const { bid } = await generateBid({
    bidOptions: { bidPriceCents: 1000 },
    designId: design.id,
  });

  const trx = await db.transaction();
  try {
    await payOutPartner(trx, {
      id: uuid.v4(),
      initiatorUserId: adminUser.id,
      invoiceId: null,
      message: "Nice job!",
      payoutAccountId: null,
      payoutAmountCents: 222,
      bidId: bid.id,
      isManual: false,
    });
    t.fail(
      "non-manual payout does not fail when no payout account is provided"
    );
  } catch {
    t.pass("non-manual payout fails when no payout account is provided");
  } finally {
    await trx.rollback();
  }
});

test("payOutPartner with manual payment", async (t: Test) => {
  const { user: adminUser } = await createUser({
    role: "ADMIN",
    withSession: false,
  });
  const { user: regularUser } = await createUser({ withSession: false });

  const design = await ProductDesignsDAO.create({
    productType: "TEESHIRT",
    title: "Plain White Tee",
    userId: regularUser.id,
  });

  const { bid } = await generateBid({
    bidOptions: { bidPriceCents: 1000 },
    designId: design.id,
  });

  await db.transaction(async (trx: Knex.Transaction) => {
    await payOutPartner(trx, {
      id: uuid.v4(),
      initiatorUserId: adminUser.id,
      invoiceId: null,
      message: "Nice job!",
      payoutAccountId: null,
      payoutAmountCents: 222,
      bidId: bid.id,
      isManual: true,
    });
    const logs = await PartnerPayoutLogsDAO.findByBidId(trx, bid.id);
    t.equal(logs.length, 1);
    t.equal(logs[0].bidId, bid.id);
    t.equal(logs[0].payoutAmountCents, 222);
  });
});

test("payOutPartner can pay amounts larger than bid amount", async (t: Test) => {
  const emailStub = sandbox().stub(EmailService, "enqueueSend").resolves();
  sandbox().stub(StripeService, "sendTransfer").resolves();

  const { user: adminUser } = await createUser({
    role: "ADMIN",
    withSession: false,
  });
  const { user: regularUser } = await createUser({ withSession: false });
  const { user: partnerUser } = await createUser({
    role: "PARTNER",
    withSession: false,
  });

  const design = await ProductDesignsDAO.create({
    productType: "TEESHIRT",
    title: "Plain White Tee",
    userId: regularUser.id,
  });

  const { collection } = await generateCollection({
    createdBy: regularUser.id,
  });
  await addDesign(collection.id, design.id);

  const { bid } = await generateBid({
    bidOptions: { bidPriceCents: 1000 },
    designId: design.id,
  });

  const payoutAccount = await PartnerPayoutAccountsDAO.create({
    id: uuid.v4(),
    createdAt: new Date(),
    deletedAt: null,
    stripeAccessToken: "123",
    stripePublishableKey: "123",
    stripeRefreshToken: "123",
    stripeUserId: "123",
    userId: partnerUser.id,
  });

  await db.transaction(async (trx: Knex.Transaction) => {
    await payOutPartner(trx, {
      id: uuid.v4(),
      initiatorUserId: adminUser.id,
      invoiceId: null,
      message: "Nice job!",
      payoutAccountId: payoutAccount.id,
      payoutAmountCents: 1235,
      bidId: bid.id,
      isManual: false,
    });
    const logs = await PartnerPayoutLogsDAO.findByPayoutAccountId(
      trx,
      payoutAccount.id
    );
    t.equal(logs.length, 1);
    t.equal(logs[0].bidId, bid.id);
    t.equal(logs[0].payoutAmountCents, 1235);
    t.equal(emailStub.firstCall.args[0].to, partnerUser.email);
  });
});
