import uuid from "node-uuid";

import createUser = require("../../test-helpers/create-user");
import db from "../../services/db";
import { test, Test } from "../../test-helpers/fresh";
import { claimAllByEmail, rawDao } from "./dao";
import { rawDao as RawTeamsDAO } from "../teams/dao";
import { TeamType } from "../teams/types";
import { Role } from "./types";

test("TeamUsersDAO.claimAllByEmail", async (t: Test) => {
  const trx = await db.transaction();
  const { user } = await createUser({ withSession: false });

  try {
    const team = await RawTeamsDAO.create(trx, {
      id: uuid.v4(),
      title: "Test Team",
      createdAt: new Date(),
      deletedAt: null,
      type: TeamType.DESIGNER,
    });

    await rawDao.create(trx, {
      id: uuid.v4(),
      userId: null,
      userEmail: "foo@example.com",
      teamId: team.id,
      role: Role.ADMIN,
    });

    const claimed = await claimAllByEmail(trx, "foo@example.com", user.id);

    t.equal(claimed.length, 1, "Claims and returns a user");
    t.equal(claimed[0].userEmail, null);
    t.equal(claimed[0].userId, user.id);

    const claimed2 = await claimAllByEmail(trx, "another@example.com", user.id);
    t.equal(claimed2.length, 0, "Claims no results for a non-matching email");
  } finally {
    await trx.rollback();
  }
});
