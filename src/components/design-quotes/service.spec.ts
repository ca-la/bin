import { sandbox, test, Test } from "../../test-helpers/fresh";
import * as PlansDAO from "../plans/dao";
import UnauthorizedError from "../../errors/unauthorized";
import * as GeneratePricingQuoteService from "../../services/generate-pricing-quote";

import * as DesignQuoteService from "./service";
import { PricingCostInput } from "../../published-types";
import db from "../../services/db";

const BASIS_POINTS = 205;

test("getDesignProductionFeeBasisPoints: valid", async (t: Test) => {
  const findLatestDesignTeamPlanStub = sandbox()
    .stub(PlansDAO, "findLatestDesignTeamPlan")
    .resolves({ costOfGoodsShareBasisPoints: BASIS_POINTS });

  t.equal(
    await DesignQuoteService.getDesignProductionFeeBasisPoints("a-design-id"),
    BASIS_POINTS
  );
  t.deepEqual(
    findLatestDesignTeamPlanStub.args,
    [[db, "a-design-id"]],
    "calls stub with correct design ID"
  );
});

test("getDesignProductionFeeBasisPoints: invalid: missing design", async (t: Test) => {
  const findLatestDesignTeamPlanStub = sandbox()
    .stub(PlansDAO, "findLatestDesignTeamPlan")
    .resolves(null);

  try {
    await DesignQuoteService.getDesignProductionFeeBasisPoints("a-design-id");
    t.fail("should not resolve");
  } catch (err) {
    t.true(err instanceof UnauthorizedError, "throws an UnauthorizedError");
  }

  t.deepEqual(findLatestDesignTeamPlanStub.args, [[db, "a-design-id"]]);
});

test("calculateDesignQuote: with costOfGoodsShareBasisPoints", async (t: Test) => {
  const findLatestDesignTeamPlanStub = sandbox()
    .stub(PlansDAO, "findLatestDesignTeamPlan")
    .resolves({ costOfGoodsShareBasisPoints: BASIS_POINTS });
  const generateUnsavedQuoteStub = sandbox()
    .stub(GeneratePricingQuoteService, "generateUnsavedQuote")
    .resolves({ id: "an-unsaved-quote", productionFeeCents: 205 });
  const calculateAmountsStub = sandbox()
    .stub(GeneratePricingQuoteService, "calculateAmounts")
    .returns({
      payLaterTotalCents: 20000,
      payNowTotalCents: 10000,
      timeTotalMs: 2345,
    });

  t.deepEqual(
    await DesignQuoteService.calculateDesignQuote(
      {
        designId: "a-design-id",
        minimumOrderQuantity: 5432,
      } as PricingCostInput,
      100
    ),
    {
      designId: "a-design-id",
      payLaterTotalCents: 20000,
      payNowTotalCents: 10000,
      timeTotalMs: 2345,
      units: 100,
      minimumOrderQuantity: 5432,
      lineItems: [{ description: "Production Fee", cents: 205 }],
    }
  );

  t.deepEqual(findLatestDesignTeamPlanStub.args, [[db, "a-design-id"]]);
  t.deepEqual(generateUnsavedQuoteStub.args, [
    [
      { designId: "a-design-id", minimumOrderQuantity: 5432 },
      100,
      BASIS_POINTS,
    ],
  ]);
  t.deepEqual(calculateAmountsStub.args, [
    [{ id: "an-unsaved-quote", productionFeeCents: 205 }],
  ]);
});

test("calculateDesignQuote: without costOfGoodsShareBasisPoints", async (t: Test) => {
  const findLatestDesignTeamPlanStub = sandbox()
    .stub(PlansDAO, "findLatestDesignTeamPlan")
    .resolves({ costOfGoodsShareBasisPoints: 0 });
  const generateUnsavedQuoteStub = sandbox()
    .stub(GeneratePricingQuoteService, "generateUnsavedQuote")
    .resolves({ id: "an-unsaved-quote", productionFeeCents: 0 });
  const calculateAmountsStub = sandbox()
    .stub(GeneratePricingQuoteService, "calculateAmounts")
    .returns({
      payLaterTotalCents: 20000,
      payNowTotalCents: 10000,
      timeTotalMs: 2345,
    });

  t.deepEqual(
    await DesignQuoteService.calculateDesignQuote(
      {
        designId: "a-design-id",
        minimumOrderQuantity: 5432,
      } as PricingCostInput,
      100
    ),
    {
      designId: "a-design-id",
      payLaterTotalCents: 20000,
      payNowTotalCents: 10000,
      timeTotalMs: 2345,
      units: 100,
      minimumOrderQuantity: 5432,
      lineItems: [],
    }
  );

  t.deepEqual(findLatestDesignTeamPlanStub.args, [[db, "a-design-id"]]);
  t.deepEqual(generateUnsavedQuoteStub.args, [
    [{ designId: "a-design-id", minimumOrderQuantity: 5432 }, 100, 0],
  ]);
  t.deepEqual(calculateAmountsStub.args, [
    [{ id: "an-unsaved-quote", productionFeeCents: 0 }],
  ]);
});
