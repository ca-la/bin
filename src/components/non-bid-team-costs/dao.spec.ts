import Knex from "knex";
import * as uuid from "node-uuid";

import db from "../../services/db";
import { test, Test } from "../../test-helpers/fresh";
import createUser from "../../test-helpers/create-user";
import { generateTeam } from "../../test-helpers/factories/team";
import NonBidTeamCostsDAO from "./dao";
import { Category } from "./types";

test("NonBidTeamCostsDAO", async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  const { team } = await generateTeam(user.id);

  return db.transaction(async (trx: Knex.Transaction) => {
    const now = new Date();
    const created = await NonBidTeamCostsDAO.create(trx, {
      id: uuid.v4(),
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      createdBy: user.id,
      cents: 10000,
      category: Category.OTHER,
      note: "A note",
      teamId: team.id,
    });

    try {
      await NonBidTeamCostsDAO.deleteById(trx, created.id);
      t.pass("allows deleting costs that were created");
    } catch {
      t.fail("should not reject");
    }

    try {
      await NonBidTeamCostsDAO.deleteById(trx, created.id);
      t.fail("should not succeed");
    } catch {
      t.pass(
        "rejects when trying to delete something that has already been deleted"
      );
    }

    try {
      await NonBidTeamCostsDAO.deleteById(trx, uuid.v4());
      t.fail("should not succeed");
    } catch {
      t.pass("rejects when trying to delete something that does not exist");
    }

    const found = await NonBidTeamCostsDAO.findById(trx, created.id);
    t.equal(found, null, ".find does not return deleted costs");
  });
});
