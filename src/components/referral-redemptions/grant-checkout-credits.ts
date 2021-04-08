import { Transaction } from "knex";

import dao from "./dao";
import { CreditsDAO, CreditType } from "../credits";
import { REFERRING_USER_CHECKOUT_CREDIT_CENTS } from "./constants";

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
    const credit = await CreditsDAO.create(trx, {
      type: CreditType.REFERRING_CHECKOUT,
      createdBy: null,
      givenTo: redemption.referringUserId,
      creditDeltaCents: REFERRING_USER_CHECKOUT_CREDIT_CENTS,
      description: `Referral credit for ${redemption.referredUserName}`,
      expiresAt: null,
    });

    await dao.update(trx, redemption.redemptionId, {
      referringUserCheckoutCreditId: credit.id,
    });
  }

  return REFERRING_USER_CHECKOUT_CREDIT_CENTS * redemptionRows.length;
}
