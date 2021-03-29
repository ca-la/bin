import tape from "tape";
import uuid from "node-uuid";

import db = require("../../services/db");
import { test } from "../../test-helpers/fresh";
import ReferralRedemptionsDAO from "./dao";
import generateInvoice from "../../test-helpers/factories/invoice";
import generateInvoicePayment from "../../test-helpers/factories/invoice-payment";
import createUser = require("../../test-helpers/create-user");
import grantCheckoutCredits from "./grant-checkout-credits";
import { ReferralRedemption } from "./types";

test("grantCheckoutCredits finds and grants credits for those who deserve them", async (t: tape.Test) => {
  const { user: referrer } = await createUser({ withSession: false });
  const { user: referred1 } = await createUser({ withSession: false });
  const { user: referred2 } = await createUser({ withSession: false });
  const { user: referred3 } = await createUser({ withSession: false });

  const trx = await db.transaction();

  for (const referred of [referred1, referred2, referred3]) {
    await ReferralRedemptionsDAO.create(trx, {
      id: uuid.v4(),
      createdAt: new Date(),
      referringUserId: referrer.id,
      referredUserId: referred.id,
      referringUserCheckoutCreditId: null,
      latestSubscriptionBonusIssuedAt: null,
      referredUserSignupCreditId: null,
    });
  }

  // 'referred 1' checks out twice, both with an amount eligible for crediit
  const { invoice: invoice1 } = await generateInvoice({
    userId: referred1.id,
    totalCents: 60000,
  });
  await generateInvoicePayment({
    invoiceId: invoice1.id,
    totalCents: 60000,
  });
  const { invoice: invoice2 } = await generateInvoice({
    userId: referred1.id,
    totalCents: 70000,
  });
  await generateInvoicePayment({
    invoiceId: invoice2.id,
    totalCents: 70000,
  });

  // 'referred 2' checks out once, for a too-low amount
  const { invoice: invoice3 } = await generateInvoice({
    userId: referred2.id,
    totalCents: 100,
  });
  await generateInvoicePayment({
    invoiceId: invoice3.id,
    totalCents: 100,
  });

  // 'referred 3' does not  check out at all
  const totalAwarded = await grantCheckoutCredits(trx);
  t.equal(totalAwarded, 50000, "$500 in credits are awarded");

  const allRedemptions = await ReferralRedemptionsDAO.find(trx);
  t.equal(allRedemptions.length, 3, "3 redemptions were created");
  const creditedRedemptions = allRedemptions.filter(
    (redemption: ReferralRedemption) =>
      redemption.referringUserCheckoutCreditId !== null
  );

  t.equal(creditedRedemptions.length, 1, "one redemption received credit");
  t.equal(creditedRedemptions[0].referredUserId, referred1.id);

  // on a subsequent run, nobody new has become eligible and nobody should be credited
  const totalAwarded2 = await grantCheckoutCredits(trx);
  t.equal(totalAwarded2, 0, "$0 additional credits are awarded");

  trx.rollback();
});
