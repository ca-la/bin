import { sandbox, test, Test } from "../../test-helpers/fresh";
import * as PlansDAO from "../plans/dao";
import UnauthorizedError from "../../errors/unauthorized";
import * as CreateQuoteService from "../../services/generate-pricing-quote/create-quote";
import { UnsavedQuote } from "../../services/generate-pricing-quote";

import * as DesignQuoteService from "./service";
import { PricingCostInput } from "../../published-types";
import db from "../../services/db";

const BASIS_POINTS = 205;
const unsavedQuote: UnsavedQuote = {
  baseCostCents: 100,
  creationTimeMs: 5,
  designId: "a-design-id",
  fulfillmentTimeMs: 5,
  materialBudgetCents: 1000,
  materialCategory: "SPECIFY",
  materialCostCents: 0,
  preProductionTimeMs: 5,
  processCostCents: 0,
  processTimeMs: 0,
  productComplexity: "SIMPLE",
  productType: "ACCESSORIES - BACKPACK",
  productionFeeCents: 2050,
  productionTimeMs: 5,
  samplingTimeMs: 5,
  sourcingTimeMs: 5,
  specificationTimeMs: 5,
  unitCostCents: 1000,
  units: 100,
};

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

test("getDesignProductionFeeBasisPoints: invalid: missing active plan", async (t: Test) => {
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
    .stub(CreateQuoteService, "createUnsavedQuote")
    .resolves(unsavedQuote);

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
      payLaterTotalCents: 106383,
      payNowTotalCents: unsavedQuote.unitCostCents * unsavedQuote.units,
      timeTotalMs: 41,
      units: 100,
      minimumOrderQuantity: 5432,
      lineItems: [
        {
          description: "Production Fee",
          explainerCopy:
            "A fee for what you produce with us, based on your plan",
          cents: 2050,
        },
      ],
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
});

test("calculateDesignQuote: without costOfGoodsShareBasisPoints", async (t: Test) => {
  const findLatestDesignTeamPlanStub = sandbox()
    .stub(PlansDAO, "findLatestDesignTeamPlan")
    .resolves({ costOfGoodsShareBasisPoints: 0 });
  const generateUnsavedQuoteStub = sandbox()
    .stub(CreateQuoteService, "createUnsavedQuote")
    .resolves({ ...unsavedQuote, productionFeeCents: 0 });

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
      payLaterTotalCents: 106383,
      payNowTotalCents: unsavedQuote.unitCostCents * unsavedQuote.units,
      timeTotalMs: 41,
      units: 100,
      minimumOrderQuantity: 5432,
      lineItems: [],
    }
  );

  t.deepEqual(findLatestDesignTeamPlanStub.args, [[db, "a-design-id"]]);
  t.deepEqual(generateUnsavedQuoteStub.args, [
    [{ designId: "a-design-id", minimumOrderQuantity: 5432 }, 100, 0],
  ]);
});
