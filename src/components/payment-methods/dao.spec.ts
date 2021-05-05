import Knex from "knex";
import uuid from "node-uuid";

import PaymentMethodsDAO from "./dao";
import db from "../../services/db";
import { test, Test } from "../../test-helpers/fresh";
import createUser = require("../../test-helpers/create-user");

test("PaymentMethodsDAO.findByUserId", async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  await db.transaction(async (trx: Knex.Transaction) => {
    await PaymentMethodsDAO.create(trx, {
      id: uuid.v4(),
      userId: user.id,
      stripeCustomerId: "cus_123",
      stripeSourceId: "sou_123",
      lastFourDigits: "1234",
      deletedAt: null,
      createdAt: new Date(),
      customerId: null,
    });

    const methods = await PaymentMethodsDAO.findByUserId(trx, user.id);
    t.equal(methods.length, 1);
    t.equal(methods[0].stripeSourceId, "sou_123");
  });
});
