import uuid from "node-uuid";
import { sandbox, test, Test } from "../../test-helpers/fresh";
import { omit } from "lodash";

import {
  create,
  findByPayoutAccountId,
  findByUserId,
  findByBidId,
} from "./dao";
import * as PayoutAccountsDAO from "../../dao/partner-payout-accounts";
import db from "../../services/db";
import createUser = require("../../test-helpers/create-user");
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

  const clock = sandbox().useFakeTimers();
  const trx = await db.transaction();
  try {
    const data = {
      id: uuid.v4(),
      invoiceId: null,
      payoutAccountId: payoutAccount.id,
      payoutAmountCents: 123400,
      message: "Get yo money",
      initiatorUserId: admin.id,
      bidId: bid.id,
      isManual: false,
    };
    const payout = await create(trx, data);

    t.deepEqual(
      omit(payout, "createdAt", "shortId"),
      data,
      "Returns the newly created resource"
    );

    clock.tick(1000);
    const data2 = {
      id: uuid.v4(),
      invoiceId: null,
      payoutAccountId: payoutAccount.id,
      payoutAmountCents: 123400,
      message: "Get yo money again!!",
      initiatorUserId: admin.id,
      bidId: bid.id,
      isManual: false,
    };
    const payout2 = await create(trx, data2);

    clock.tick(1000);
    const data3 = {
      id: uuid.v4(),
      invoiceId: null,
      payoutAccountId: anotherPayoutAccount.id,
      payoutAmountCents: 333444,
      message: "Keep getting money!",
      initiatorUserId: admin.id,
      bidId: anotherBid.id,
      isManual: false,
    };
    await create(trx, data3);

    t.deepEqual(
      await findByPayoutAccountId(trx, payoutAccount.id),
      [payout2, payout],
      "find by payout account ID"
    );

    t.deepEqual(
      await findByUserId(trx, user.id),
      [
        {
          ...payout2,
          collectionId: collection.id,
          collectionTitle: collection.title,
        },
        {
          ...payout,
          collectionId: collection.id,
          collectionTitle: collection.title,
        },
      ],
      "find by user ID"
    );

    t.deepEqual(
      await findByBidId(trx, bid.id),
      [payout2, payout],
      "find by bid ID"
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
