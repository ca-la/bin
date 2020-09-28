import uuid from "node-uuid";
import { test, Test } from "../../test-helpers/fresh";
import { omit } from "lodash";

import { create, findByPayoutAccountId, findByUserId } from "./dao";
import PayoutAccountsDAO = require("../../dao/partner-payout-accounts");
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
  });
  await generateDesignEvent({
    type: "ACCEPT_SERVICE_BID",
    bidId: bid.id,
    actorId: user.id,
    designId: design.id,
  });

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
  const payout = await create(data);

  t.deepEqual(
    omit(payout, "createdAt", "shortId"),
    data,
    "Returns the newly created resource"
  );

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
  const payout2 = await create(data2);
  const logsFromAccount = await findByPayoutAccountId(payoutAccount.id);
  t.deepEqual(logsFromAccount, [payout2, payout]);

  const logsFromUser = await findByUserId(user.id);
  t.deepEqual(logsFromUser, [
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
  ]);
});

test("empty case when searching logs", async (t: Test) => {
  const { user } = await createUser({ role: "PARTNER", withSession: false });
  const logsFromUser = await findByUserId(user.id);
  t.deepEqual(logsFromUser, [], "Returns an empty list");
});
