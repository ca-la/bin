import Knex from "knex";

import { sandbox, test, Test } from "../../test-helpers/fresh";
import * as PlansDAO from "../plans/dao";
import UnauthorizedError from "../../errors/unauthorized";
import * as CreateQuoteService from "../../services/generate-pricing-quote/create-quote";
import { UnsavedQuote } from "../../services/generate-pricing-quote";
import db from "../../services/db";
import createUser from "../../test-helpers/create-user";
import { costCollection } from "../../test-helpers/cost-collection";
import { CreditsDAO, CreditType } from "../credits";
import { generateSubscription } from "../../test-helpers/factories/subscription";
import * as SubscriptionsDAO from "../subscriptions/dao";

import * as DesignQuoteService from "./service";
import { PricingCostInput } from "../pricing-cost-inputs/types";

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

test("getCartDetails: empty", async (t: Test) => {
  const designer = await createUser({ withSession: false });
  const cartDetails = await db.transaction((trx: Knex.Transaction) =>
    DesignQuoteService.getCartDetails(trx, [], designer.user.id)
  );

  t.deepEqual(cartDetails, {
    quotes: [],
    combinedLineItems: [],
    subtotalCents: 0,
    dueNowCents: 0,
    dueLaterCents: 0,
    creditAppliedCents: 0,
    balanceDueCents: 0,
    totalUnits: 0,
  });
});

test("getCartDetails: no credits, no production fee", async (t: Test) => {
  const {
    team,
    collectionDesigns,
    user: { designer },
  } = await costCollection();

  await db.transaction(async (trx: Knex.Transaction) => {
    const activePlan = await SubscriptionsDAO.findActiveByTeamId(trx, team.id);

    if (activePlan) {
      await SubscriptionsDAO.update(
        activePlan.id,
        { cancelledAt: new Date() },
        trx
      );
    }

    await generateSubscription(
      trx,
      { teamId: team.id },
      { costOfGoodsShareBasisPoints: 0 }
    );
  });

  const cartDetails = await db.transaction((trx: Knex.Transaction) =>
    DesignQuoteService.getCartDetails(
      trx,
      [
        { designId: collectionDesigns[0].id, units: 100 },
        { designId: collectionDesigns[1].id, units: 100 },
      ],
      designer.user.id
    )
  );

  t.deepEqual(cartDetails, {
    quotes: [
      {
        designId: collectionDesigns[0].id,
        lineItems: [],
        minimumOrderQuantity: 1,
        payLaterTotalCents: 5_276_60,
        payNowTotalCents: 4_960_00,
        timeTotalMs: 1219764706,
        units: 100,
      },
      {
        designId: collectionDesigns[1].id,
        lineItems: [],
        minimumOrderQuantity: 1,
        payLaterTotalCents: 2_282_98,
        payNowTotalCents: 2_146_00,
        timeTotalMs: 711529412,
        units: 100,
      },
    ],
    combinedLineItems: [],
    subtotalCents: 7_106_00,
    dueNowCents: 7_106_00,
    dueLaterCents: 0,
    creditAppliedCents: 0,
    balanceDueCents: 7_106_00,
    totalUnits: 100 + 100,
  });
});

test("getCartDetails: no credits", async (t: Test) => {
  const {
    collectionDesigns,
    user: { designer },
  } = await costCollection();

  const cartDetails = await db.transaction((trx: Knex.Transaction) =>
    DesignQuoteService.getCartDetails(
      trx,
      [
        { designId: collectionDesigns[0].id, units: 100 },
        { designId: collectionDesigns[1].id, units: 100 },
      ],
      designer.user.id
    )
  );

  t.deepEqual(cartDetails, {
    quotes: [
      {
        designId: collectionDesigns[0].id,
        lineItems: [
          {
            cents: 4_960_00 * 1.2 - 4_960_00,
            description: "Production Fee",
            explainerCopy:
              "A fee for what you produce with us, based on your plan",
          },
        ],
        minimumOrderQuantity: 1,
        payLaterTotalCents: 5_276_60,
        payNowTotalCents: 4_960_00,
        timeTotalMs: 1219764706,
        units: 100,
      },
      {
        designId: collectionDesigns[1].id,
        lineItems: [
          {
            cents: 2_146_00 * 1.2 - 2_146_00,
            description: "Production Fee",
            explainerCopy:
              "A fee for what you produce with us, based on your plan",
          },
        ],
        minimumOrderQuantity: 1,
        payLaterTotalCents: 2_282_98,
        payNowTotalCents: 2_146_00,
        timeTotalMs: 711529412,
        units: 100,
      },
    ],
    combinedLineItems: [
      {
        cents: 7_106_00 * 1.2 - 7_106_00,
        description: "Production Fee",
        explainerCopy: "A fee for what you produce with us, based on your plan",
      },
    ],
    subtotalCents: 7_106_00,
    dueNowCents: 7_106_00 * 1.2,
    dueLaterCents: 0,
    creditAppliedCents: 0,
    balanceDueCents: 7_106_00 * 1.2,
    totalUnits: 100 + 100,
  });
});

test("getCartDetails: with partial credits", async (t: Test) => {
  const {
    collectionDesigns,
    user: { designer, admin },
  } = await costCollection();

  await db.transaction((trx: Knex.Transaction) =>
    CreditsDAO.create(trx, {
      type: CreditType.MANUAL,
      creditDeltaCents: 1230,
      createdBy: admin.user.id,
      description: "For being a good customer",
      expiresAt: null,
      givenTo: designer.user.id,
      financingAccountId: null,
    })
  );

  const cartDetails = await db.transaction((trx: Knex.Transaction) =>
    DesignQuoteService.getCartDetails(
      trx,
      [
        { designId: collectionDesigns[0].id, units: 100 },
        { designId: collectionDesigns[1].id, units: 100 },
      ],
      designer.user.id
    )
  );

  t.deepEqual(cartDetails, {
    quotes: [
      {
        designId: collectionDesigns[0].id,
        lineItems: [
          {
            cents: 4_960_00 * 1.2 - 4_960_00,
            description: "Production Fee",
            explainerCopy:
              "A fee for what you produce with us, based on your plan",
          },
        ],
        minimumOrderQuantity: 1,
        payLaterTotalCents: 5_276_60,
        payNowTotalCents: 4_960_00,
        timeTotalMs: 1219764706,
        units: 100,
      },
      {
        designId: collectionDesigns[1].id,
        lineItems: [
          {
            cents: 2_146_00 * 1.2 - 2_146_00,
            description: "Production Fee",
            explainerCopy:
              "A fee for what you produce with us, based on your plan",
          },
        ],
        minimumOrderQuantity: 1,
        payLaterTotalCents: 2_282_98,
        payNowTotalCents: 2_146_00,
        timeTotalMs: 711529412,
        units: 100,
      },
    ],
    combinedLineItems: [
      {
        cents: 7_106_00 * 1.2 - 7_106_00,
        description: "Production Fee",
        explainerCopy: "A fee for what you produce with us, based on your plan",
      },
      {
        cents: -12_30,
        description: "Credit Applied",
        explainerCopy: null,
      },
    ],
    subtotalCents: 7_106_00,
    dueNowCents: 7_106_00 * 1.2,
    dueLaterCents: 0,
    creditAppliedCents: 12_30,
    balanceDueCents: 7_106_00 * 1.2 - 12_30,
    totalUnits: 100 + 100,
  });
});

test("getCartDetails: with full credits", async (t: Test) => {
  const {
    collectionDesigns,
    user: { designer, admin },
  } = await costCollection();

  await db.transaction((trx: Knex.Transaction) =>
    CreditsDAO.create(trx, {
      type: CreditType.MANUAL,
      creditDeltaCents: 12300000,
      createdBy: admin.user.id,
      description: "For being a good customer",
      expiresAt: null,
      givenTo: designer.user.id,
      financingAccountId: null,
    })
  );

  const cartDetails = await db.transaction((trx: Knex.Transaction) =>
    DesignQuoteService.getCartDetails(
      trx,
      [
        { designId: collectionDesigns[0].id, units: 100 },
        { designId: collectionDesigns[1].id, units: 100 },
      ],
      designer.user.id
    )
  );

  t.deepEqual(cartDetails, {
    quotes: [
      {
        designId: collectionDesigns[0].id,
        lineItems: [
          {
            cents: 4_960_00 * 1.2 - 4_960_00,
            description: "Production Fee",
            explainerCopy:
              "A fee for what you produce with us, based on your plan",
          },
        ],
        minimumOrderQuantity: 1,
        payLaterTotalCents: 5_276_60,
        payNowTotalCents: 4_960_00,
        timeTotalMs: 1219764706,
        units: 100,
      },
      {
        designId: collectionDesigns[1].id,
        lineItems: [
          {
            cents: 2_146_00 * 1.2 - 2_146_00,
            description: "Production Fee",
            explainerCopy:
              "A fee for what you produce with us, based on your plan",
          },
        ],
        minimumOrderQuantity: 1,
        payLaterTotalCents: 2_282_98,
        payNowTotalCents: 2_146_00,
        timeTotalMs: 711529412,
        units: 100,
      },
    ],
    combinedLineItems: [
      {
        cents: 7_106_00 * 1.2 - 7_106_00,
        description: "Production Fee",
        explainerCopy: "A fee for what you produce with us, based on your plan",
      },
      {
        cents: 7_106_00 * -1.2,
        description: "Credit Applied",
        explainerCopy: null,
      },
    ],
    subtotalCents: 7_106_00,
    dueNowCents: 7_106_00 * 1.2,
    dueLaterCents: 0,
    creditAppliedCents: 7_106_00 * 1.2,
    balanceDueCents: 0,
    totalUnits: 100 + 100,
  });
});
