import Knex from "knex";
import uuid from "node-uuid";

import PaymentMethodsDAO from "./dao";
import CustomersDAO from "../customers/dao";
import db from "../../services/db";
import { test, Test } from "../../test-helpers/fresh";
import createUser = require("../../test-helpers/create-user");
import { customerTestBlank } from "../customers/types";

test("PaymentMethodsDAO supports creation and retrieval", async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  await db.transaction(async (trx: Knex.Transaction) => {
    const customer = await CustomersDAO.create(trx, {
      ...customerTestBlank,
      userId: user.id,
      teamId: null,
      id: uuid.v4(),
    });
    const created = await PaymentMethodsDAO.create(trx, {
      id: uuid.v4(),
      stripeCustomerId: "cus_123",
      stripeSourceId: "sou_123",
      lastFourDigits: "1234",
      deletedAt: null,
      createdAt: new Date(),
      customerId: customer.id,
    });

    const method = await PaymentMethodsDAO.findById(trx, created.id);
    t.deepEquals(method, created, "Created matches fetched PaymentMethod");
  });
});
