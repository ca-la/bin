import tape from "tape";

import { test } from "../../test-helpers/fresh";
import { redeemReferralCode, InvalidReferralCodeError } from "./service";
import db = require("../../services/db");
import createUser = require("../../test-helpers/create-user");

test("redeemReferralCode", async (t: tape.Test) => {
  const { user: referrer } = await createUser({ withSession: false });
  const { user: referred } = await createUser({ withSession: false });

  const trx = await db.transaction();

  const created = await redeemReferralCode({
    trx,
    referredUserId: referred.id,
    referralCode: referrer.referralCode,
  });

  t.equal(created.referredUserId, referred.id);
  t.equal(created.referringUserId, referrer.id);

  trx.rollback();
});

test("redeemReferralCode with invalid code", async (t: tape.Test) => {
  const { user: referred } = await createUser({ withSession: false });

  const trx = await db.transaction();

  try {
    await redeemReferralCode({
      trx,
      referredUserId: referred.id,
      referralCode: "veryfakecode",
    });
    t.fail("Shouldn't get here");
  } catch (err) {
    t.equal(err instanceof InvalidReferralCodeError, true);
    t.equal(err.message, '"veryfakecode" is not a valid referral code');
  } finally {
    trx.rollback();
  }
});
