import Knex from "knex";

import * as attachSource from "../../services/stripe/attach-source";
import PaymentMethodsDAO from "./dao";
import createPaymentMethod from "./create-payment-method";
import Stripe = require("../../services/stripe");
import db from "../../services/db";
import { sandbox, test, Test } from "../../test-helpers/fresh";
import { omit } from "lodash";

const testTime = new Date();

test("createPaymentMethod", async (t: Test) => {
  sandbox().useFakeTimers(testTime);
  const attachStub = sandbox().stub(attachSource, "default").resolves({
    id: "source-123",
    last4: "1234",
  });

  sandbox().stub(Stripe, "findOrCreateCustomerId").resolves("cus_123");
  const createStub = sandbox()
    .stub(PaymentMethodsDAO, "create")
    .resolves({ id: "1234" });

  await db.transaction(async (trx: Knex.Transaction) => {
    const method = await createPaymentMethod({
      token: "tok_123",
      userId: "user-123",
      trx,
    });

    t.equal(method.id, "1234");
  });

  t.equals(attachStub.callCount, 1);
  t.deepEquals(attachStub.firstCall.args[0], {
    cardToken: "tok_123",
    customerId: "cus_123",
  });

  t.equals(createStub.callCount, 1);
  t.deepEquals(omit(createStub.firstCall.args[1], "id"), {
    createdAt: testTime,
    deletedAt: null,
    lastFourDigits: "1234",
    stripeCustomerId: "cus_123",
    stripeSourceId: "source-123",
    userId: "user-123",
  });
});
