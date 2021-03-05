import tape from "tape";

import { test } from "../../test-helpers/fresh";
import ReferralRedemptionsDAO from "./dao";
import { ReferralRedemption } from "./types";
import db = require("../../services/db");
import createUser = require("../../test-helpers/create-user");

test("ReferralRedemption DAO supports creation/retrieval", async (t: tape.Test) => {
  const { user: referrer } = await createUser({ withSession: false });
  const { user: referred } = await createUser({ withSession: false });

  const data: ReferralRedemption = {
    id: "7b83b1be-bcfa-46f3-81eb-6b20437a617b",
    createdAt: new Date(),
    referringUserId: referrer.id,
    referredUserId: referred.id,
  };

  const trx = await db.transaction();

  const created = await ReferralRedemptionsDAO.create(trx, data);
  t.deepEqual(created, data);

  const found = await ReferralRedemptionsDAO.findById(trx, data.id);
  t.deepEqual(found, data);

  trx.rollback();
});
