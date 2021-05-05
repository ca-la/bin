import uuid from "node-uuid";

import CustomersDAO from "./dao";
import { test, Test } from "../../test-helpers/fresh";
import { Customer } from "./types";
import { generateTeam } from "../../test-helpers/factories/team";
import createUser from "../../test-helpers/create-user";
import db from "../../services/db";

test("Customers DAO supports creation and retrieval", async (t: Test) => {
  const { user } = await createUser();
  const { team } = await generateTeam(user.id);
  const customer: Customer = {
    id: uuid.v4(),
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    teamId: team.id,
    userId: null,
    provider: "STRIPE",
    customerId: "an-id",
  };
  const trx = await db.transaction();
  try {
    const created = await CustomersDAO.create(trx, customer);
    const found = await CustomersDAO.findById(trx, created.id);
    t.deepEquals(created, found, "Created matches retreved");
  } finally {
    await trx.rollback();
  }
});
