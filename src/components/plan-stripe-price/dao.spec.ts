import { test, Test } from "../../test-helpers/fresh";

import db from "../../services/db";
import generatePlan from "../../test-helpers/factories/plan";

import * as PlanStripePricesDAO from "./dao";

test("PlanStripePricesDAO.create", async (t: Test) => {
  const trx = await db.transaction();
  try {
    const plan = await generatePlan(trx);
    const inserted = await PlanStripePricesDAO.create(trx, {
      planId: plan.id,
      stripePriceId: "a-stripe-price-id",
    });

    t.equal(inserted.planId, plan.id);
    t.equal(inserted.stripePriceId, "a-stripe-price-id");
  } finally {
    await trx.rollback();
  }
});
