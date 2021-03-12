import { Transaction } from "knex";
import uuid from "node-uuid";

import ReferralRedemptionsDAO from "./dao";
import * as UsersDAO from "../users/dao";

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

  return await ReferralRedemptionsDAO.create(trx, {
    id: uuid.v4(),
    createdAt: new Date(),
    referredUserId,
    referringUserId: referringUser.id,
    referringUserCheckoutCreditId: null,
  });
}
