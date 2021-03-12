import { Transaction } from "knex";

import dao from "./dao";
import { addCredit } from "../credits/dao";

// For a ("referring") user who has referred someone, the amount they should be
// rewarded when someone they refers checks out.
//
// This amount is only rewarded for the first checkout payment by each user they
// refer which meets or exceeds this amount.
export const REFERRING_USER_CHECKOUT_CREDIT_CENTS = 50000;

interface Result {
  redemptionId: string;
  referringUserId: string;
  referredUserId: string;
  referredUserName: string;
}

export default async function grantCheckoutCredits(
  trx: Transaction
): Promise<number> {
  // Obtain an update lock so that multiple parallel calls don't grant double credits
  await trx.raw(`
    select * from referral_redemptions
    where referring_user_checkout_credit_id is null
    for update;
  `);

  const redemptionResult = await trx.raw(
    `
with eligible_redemptions as (
  select
    referral_redemptions.id as "redemptionId",
    referral_redemptions.referring_user_id as "referringUserId",
    referral_redemptions.referred_user_id as "referredUserId",
    referred_users.name as "referredUserName"
  from referral_redemptions
  inner join users as referred_users
    on referral_redemptions.referred_user_id = referred_users.id
  inner join invoice_with_payments as payments
    on payments.user_id = referred_users.id
  where payments.total_cents > ?
  and referral_redemptions.referring_user_checkout_credit_id is null
  order by referral_redemptions.created_at asc
)
select distinct on ("referredUserId")
  eligible_redemptions.*
from eligible_redemptions;
  `,
    [REFERRING_USER_CHECKOUT_CREDIT_CENTS]
  );

  const redemptionRows = redemptionResult.rows as Result[];

  for (const redemption of redemptionRows) {
    const creditId = await addCredit(
      {
        description: `Referral credit for ${redemption.referredUserName}`,
        amountCents: REFERRING_USER_CHECKOUT_CREDIT_CENTS,
        createdBy: redemption.referringUserId,
        givenTo: redemption.referringUserId,
        expiresAt: null,
      },
      trx
    );

    await dao.update(trx, redemption.redemptionId, {
      referringUserCheckoutCreditId: creditId,
    });
  }

  return REFERRING_USER_CHECKOUT_CREDIT_CENTS * redemptionRows.length;
}
