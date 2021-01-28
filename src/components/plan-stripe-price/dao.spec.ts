import { test, Test } from "../../test-helpers/fresh";

import db from "../../services/db";
import generatePlan from "../../test-helpers/factories/plan";

import * as PlanStripePricesDAO from "./dao";
import { PlanStripePrice, PlanStripePriceType } from "./types";

test("PlanStripePricesDAO.createAll", async (t: Test) => {
  const trx = await db.transaction();
  try {
    const plan = await generatePlan(trx);
    const p1: PlanStripePrice = {
      planId: plan.id,
      stripePriceId: "a-stripe-price-id",
      type: PlanStripePriceType.BASE_COST,
    };
    const p2: PlanStripePrice = {
      planId: plan.id,
      stripePriceId: "another-stripe-price-id",
      type: PlanStripePriceType.PER_SEAT,
    };

    const inserted = await PlanStripePricesDAO.createAll(trx, [p1, p2]);

    t.deepEqual(inserted, [p1, p2]);
  } finally {
    await trx.rollback();
  }
});

test("PlanStripePricesDAO.create", async (t: Test) => {
  const trx = await db.transaction();
  try {
    const plan = await generatePlan(trx);
    const inserted = await PlanStripePricesDAO.create(trx, {
      planId: plan.id,
      stripePriceId: "a-stripe-price-id",
      type: PlanStripePriceType.BASE_COST,
    });

    t.equal(inserted.planId, plan.id);
    t.equal(inserted.stripePriceId, "a-stripe-price-id");
    t.equal(inserted.type, PlanStripePriceType.BASE_COST);
  } finally {
    await trx.rollback();
  }
});
