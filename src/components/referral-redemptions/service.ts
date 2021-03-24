import { Transaction } from "knex";
import uuid from "node-uuid";

import ReferralRedemptionsDAO from "./dao";
import * as UsersDAO from "../users/dao";
import { addCredit } from "../credits/dao";
import { REFERRED_USER_SIGNUP_CENTS } from "./grant-checkout-credits";

export class InvalidReferralCodeError extends Error {
  constructor(message: string) {
    super(message);
    this.message = message;
    this.name = "InvalidReferralCodeError";
  }
}

interface Options {
  trx: Transaction;
  referredUserId: string;
  referralCode: string;
}

export async function redeemReferralCode({
  trx,
  referredUserId,
  referralCode,
}: Options) {
  const referringUser = await UsersDAO.findByReferralCode(referralCode);

  if (!referringUser) {
    throw new InvalidReferralCodeError(
      `"${referralCode}" is not a valid referral code`
    );
  }

  const now = new Date();
  const creditId = await addCredit(
    {
      description: `Referral credit for registration`,
      amountCents: REFERRED_USER_SIGNUP_CENTS,
      createdBy: referredUserId,
      givenTo: referredUserId,
      expiresAt: new Date(now.setFullYear(now.getFullYear() + 1)),
    },
    trx
  );

  return await ReferralRedemptionsDAO.create(trx, {
    id: uuid.v4(),
    createdAt: new Date(),
    referredUserId,
    referringUserId: referringUser.id,
    referringUserCheckoutCreditId: null,
    referredUserSignupCreditId: creditId,
  });
}
