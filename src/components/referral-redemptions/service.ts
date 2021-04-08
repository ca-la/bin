import { Transaction } from "knex";
import uuid from "node-uuid";
import { CreditsDAO, CreditType } from "../credits";
import ReferralRedemptionsDAO from "./dao";
import * as UsersDAO from "../users/dao";

import { REFERRED_USER_SIGNUP_CENTS } from "./constants";

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
  await CreditsDAO.create(trx, {
    type: CreditType.REFERRED_SIGNUP,
    createdBy: null,
    givenTo: referredUserId,
    creditDeltaCents: REFERRED_USER_SIGNUP_CENTS,
    description: `Referral credit for registration`,
    expiresAt: new Date(now.setFullYear(now.getFullYear() + 1)),
  });

  return await ReferralRedemptionsDAO.create(trx, {
    id: uuid.v4(),
    createdAt: new Date(),
    referredUserId,
    referringUserId: referringUser.id,
    referringUserCheckoutCreditId: null,
  });
}
