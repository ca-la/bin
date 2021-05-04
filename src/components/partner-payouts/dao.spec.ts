import uuid from "node-uuid";
import { sandbox, test, Test } from "../../test-helpers/fresh";

import {
  create,
  findByPayoutAccountId,
  findByUserId,
  findByBidId,
  deleteById,
} from "./dao";
import * as PayoutAccountsDAO from "../../dao/partner-payout-accounts";
import db from "../../services/db";
import createUser from "../../test-helpers/create-user";
import createDesign from "../../services/create-design";
import generateBid from "../../test-helpers/factories/bid";
import generateCollection from "../../test-helpers/factories/collection";
import { addDesign } from "../../test-helpers/collections";
import generateDesignEvent from "../../test-helpers/factories/design-event";

test("can create a payout log and find the logs", async (t: Test) => {
  const { user: admin } = await createUser({
    role: "ADMIN",
    withSession: false,
  });
  const { user } = await createUser({ role: "PARTNER", withSession: false });
  const { user: anotherUser } = await createUser({
    role: "PARTNER",
    withSession: false,
  });
  const { user: emptyUser } = await createUser({
    role: "PARTNER",
    withSession: false,
  });

  const payoutAccount = await PayoutAccountsDAO.create({
    id: uuid.v4(),
    createdAt: new Date(),
    deletedAt: null,
    userId: user.id,
    stripeAccessToken: "stripe-access-one",
    stripeRefreshToken: "stripe-refresh-one",
    stripePublishableKey: "stripe-publish-one",
    stripeUserId: "stripe-user-one",
  });
  const anotherPayoutAccount = await PayoutAccountsDAO.create({
    id: uuid.v4(),
    createdAt: new Date(),
    deletedAt: null,
    userId: anotherUser.id,
    stripeAccessToken: "stripe-access-one",
    stripeRefreshToken: "stripe-refresh-one",
    stripePublishableKey: "stripe-publish-one",
    stripeUserId: "stripe-user-one",
  });
  const { collection } = await generateCollection({
    title: "Brett's Bolo",
  });
  const design = await createDesign({
    productType: "TEESHIRT",
    title: "Plain White Tee",
    userId: user.id,
  });
  await addDesign(collection.id, design.id);
  const { bid } = await generateBid({
    bidOptions: {
      bidPriceCents: 1000,
      assignee: {
        type: "USER",
        id: user.id,
      },
    },
    designId: design.id,
    userId: admin.id,
  });
  await generateDesignEvent({
    type: "ACCEPT_SERVICE_BID",
    bidId: bid.id,
    actorId: user.id,
    designId: design.id,
  });

  const { bid: anotherBid } = await generateBid({
    bidOptions: {
      bidPriceCents: 100000,
      assignee: {
        type: "USER",
        id: anotherUser.id,
      },
    },
    designId: design.id,
    userId: admin.id,
  });
  await generateDesignEvent({
    type: "ACCEPT_SERVICE_BID",
    bidId: anotherBid.id,
    actorId: anotherUser.id,
    designId: design.id,
  });

  const clock = sandbox().useFakeTimers();
  const trx = await db.transaction();
  try {
    const payout1 = await create(trx, {
      invoiceId: null,
      payoutAccountId: payoutAccount.id,
      payoutAmountCents: 123400,
      message: "Get yo money",
      initiatorUserId: admin.id,
      bidId: bid.id,
      isManual: false,
      deletedAt: null,
    });

    clock.tick(1000);
    const payout2 = await create(trx, {
      invoiceId: null,
      payoutAccountId: payoutAccount.id,
      payoutAmountCents: 123400,
      message: "Get yo money again!!",
      initiatorUserId: admin.id,
      bidId: bid.id,
      isManual: false,
      deletedAt: null,
    });

    clock.tick(1000);
    const payout3 = await create(trx, {
      invoiceId: null,
      payoutAccountId: anotherPayoutAccount.id,
      payoutAmountCents: 333444,
      message: "Keep getting money!",
      initiatorUserId: admin.id,
      bidId: anotherBid.id,
      isManual: false,
      deletedAt: null,
    });

    clock.tick(1000);
    const payout4 = await create(trx, {
      invoiceId: null,
      payoutAccountId: anotherPayoutAccount.id,
      payoutAmountCents: 333444,
      message: "Keep getting money still!",
      initiatorUserId: admin.id,
      bidId: anotherBid.id,
      isManual: false,
      deletedAt: null,
    });
    await deleteById(trx, payout4.id);

    t.deepEqual(
      await findByPayoutAccountId(trx, payoutAccount.id),
      [payout2, payout1],
      "find by payout account ID"
    );

    t.deepEqual(
      await findByPayoutAccountId(trx, anotherPayoutAccount.id),
      [payout3],
      "find by payout account ID without deleted payouts"
    );

    t.deepEqual(
      await findByUserId(trx, user.id),
      [
        {
          ...payout2,
          collectionId: collection.id,
          collectionTitle: collection.title,
          payoutAccountUserId: payoutAccount.userId,
        },
        {
          ...payout1,
          collectionId: collection.id,
          collectionTitle: collection.title,
          payoutAccountUserId: payoutAccount.userId,
        },
      ],
      "find by user ID"
    );

    t.deepEqual(
      await findByUserId(trx, anotherUser.id),
      [
        {
          ...payout3,
          collectionId: collection.id,
          collectionTitle: collection.title,
          payoutAccountUserId: anotherPayoutAccount.userId,
        },
      ],
      "find by user ID without deleted payouts"
    );

    t.deepEqual(
      await findByBidId(trx, bid.id),
      [
        {
          ...payout2,
          payoutAccountUserId: payoutAccount.userId,
          collectionTitle: collection.title,
          collectionId: collection.id,
        },
        {
          ...payout1,
          payoutAccountUserId: payoutAccount.userId,
          collectionTitle: collection.title,
          collectionId: collection.id,
        },
      ],
      "find by bid ID"
    );

    t.deepEqual(
      await findByBidId(trx, anotherBid.id),
      [
        {
          ...payout3,
          payoutAccountUserId: anotherPayoutAccount.userId,
          collectionTitle: collection.title,
          collectionId: collection.id,
        },
      ],
      "find by bid ID without deleted payouts"
    );

    t.deepEqual(
      await findByUserId(trx, emptyUser.id),
      [],
      "returns empty for user with no logs"
    );
  } finally {
    await trx.rollback();
  }
});

test("PartnerPayoutsDAO.deleteById with missing log", async (t: Test) => {
  const trx = await db.transaction();
  try {
    await deleteById(trx, uuid.v4());
    t.fail("does not succeed");
  } catch (err) {
    t.pass("rejects if payout does not exist");
  } finally {
    await trx.rollback();
  }
});

test("PartnerPayoutsDAO.deleteById with found log", async (t: Test) => {
  const { user: admin } = await createUser({
    role: "ADMIN",
    withSession: false,
  });
  const { user } = await createUser({ role: "PARTNER", withSession: false });

  const payoutAccount = await PayoutAccountsDAO.create({
    id: uuid.v4(),
    createdAt: new Date(),
    deletedAt: null,
    userId: user.id,
    stripeAccessToken: "stripe-access-one",
    stripeRefreshToken: "stripe-refresh-one",
    stripePublishableKey: "stripe-publish-one",
    stripeUserId: "stripe-user-one",
  });
  const { collection } = await generateCollection({
    title: "Brett's Bolo",
  });
  const design = await createDesign({
    productType: "TEESHIRT",
    title: "Plain White Tee",
    userId: user.id,
    collectionIds: [collection.id],
  });
  const { bid } = await generateBid({
    bidOptions: {
      bidPriceCents: 1000,
      assignee: {
        type: "USER",
        id: user.id,
      },
    },
    designId: design.id,
    userId: admin.id,
  });
  await generateDesignEvent({
    type: "ACCEPT_SERVICE_BID",
    bidId: bid.id,
    actorId: user.id,
    designId: design.id,
  });

  const trx = await db.transaction();
  try {
    const payout = await create(trx, {
      invoiceId: null,
      payoutAccountId: payoutAccount.id,
      payoutAmountCents: 123400,
      message: "Get yo money",
      initiatorUserId: admin.id,
      bidId: bid.id,
      isManual: false,
      deletedAt: null,
    });
    const count = await deleteById(trx, payout.id);
    t.equals(count, 1, "returns deleted rows count");
  } catch (err) {
    t.fail("should not fail");
  } finally {
    await trx.rollback();
  }
});
