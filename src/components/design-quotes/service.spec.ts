import Knex from "knex";
import uuid from "node-uuid";

import { sandbox, test, Test, db } from "../../test-helpers/fresh";
import * as PlansDAO from "../plans/dao";
import InsufficientPlanError from "../../errors/insufficient-plan";
import * as CreateQuoteService from "../../services/generate-pricing-quote/create-quote";
import { UnsavedQuote } from "../../services/generate-pricing-quote";
import createUser from "../../test-helpers/create-user";
import { costCollection } from "../../test-helpers/cost-collection";
import { CreditsDAO, CreditType } from "../credits";
import FinancingAccountsDAO from "../financing-accounts/dao";
import * as ProductDesignsDAO from "../product-designs/dao/dao";
import { generateSubscription } from "../../test-helpers/factories/subscription";
import * as SubscriptionsDAO from "../subscriptions/dao";
import { PricingCostInput } from "../pricing-cost-inputs/types";
import { FinancingAccountDb } from "../financing-accounts/types";

import * as DesignQuoteService from "./service";
import ResourceNotFoundError from "../../errors/resource-not-found";
import {
  Complexity,
  MaterialCategory,
  ProductType,
} from "../../domain-objects/pricing";

const BASIS_POINTS = 205;
const unsavedQuote: UnsavedQuote = {
  baseCostCents: 100,
  creationTimeMs: 5,
  designId: "a-design-id",
  fulfillmentTimeMs: 5,
  materialBudgetCents: 1000,
  materialCategory: MaterialCategory.SPECIFY,
  materialCostCents: 0,
  preProductionTimeMs: 5,
  processCostCents: 0,
  processTimeMs: 0,
  productComplexity: Complexity.SIMPLE,
  productType: ProductType["ACCESSORIES - BACKPACK"],
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
    t.true(
      err instanceof InsufficientPlanError,
      "throws an InsufficientPlanError"
    );
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
          description: "Service Fee",
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
    financingItems: [],
    subtotalCents: 0,
    dueNowCents: 0,
    dueLaterCents: 0,
    creditAppliedCents: 0,
    balanceDueCents: 0,
    totalUnits: 0,
  });
});

test("getCartDetails: invalid: deleted design", async (t: Test) => {
  const {
    collectionDesigns,
    user: { designer },
  } = await costCollection();

  await db.transaction((trx: Knex.Transaction) =>
    ProductDesignsDAO.deleteByIds({ designIds: [collectionDesigns[0].id], trx })
  );

  try {
    await db.transaction((trx: Knex.Transaction) =>
      DesignQuoteService.getCartDetails(
        trx,
        [
          { designId: collectionDesigns[0].id, units: 100 },
          { designId: collectionDesigns[1].id, units: 100 },
        ],
        designer.user.id
      )
    );
    t.fail("Should not succeed");
  } catch (err) {
    t.true(
      err instanceof ResourceNotFoundError,
      "throws ResourceNotFoundError if design is deleted"
    );
  }
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
    financingItems: [],
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
            description: "Service Fee",
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
            description: "Service Fee",
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
        description: "Service Fee",
        explainerCopy: "A fee for what you produce with us, based on your plan",
      },
    ],
    financingItems: [],
    subtotalCents: 7_106_00,
    dueNowCents: 7_106_00 * 1.2,
    dueLaterCents: 0,
    creditAppliedCents: 0,
    balanceDueCents: 7_106_00 * 1.2,
    totalUnits: 100 + 100,
  });
});

test("getCartDetails: with partial credit with no available financing", async (t: Test) => {
  const {
    collectionDesigns,
    user: { designer, admin },
    team,
  } = await costCollection();
  let financingAccount: FinancingAccountDb;
  await db.transaction(async (trx: Knex.Transaction) => {
    financingAccount = await FinancingAccountsDAO.create(trx, {
      closedAt: null,
      createdAt: new Date(),
      creditLimitCents: 500000,
      feeBasisPoints: 1000,
      id: uuid.v4(),
      teamId: team.id,
      termLengthDays: 90,
    });
    await CreditsDAO.create(trx, {
      type: CreditType.REMOVE,
      creditDeltaCents: -5_000_00,
      createdBy: admin.user.id,
      description: "Payment",
      expiresAt: null,
      givenTo: null,
      financingAccountId: financingAccount.id,
    });
    await CreditsDAO.create(trx, {
      type: CreditType.MANUAL,
      creditDeltaCents: 1230,
      createdBy: admin.user.id,
      description: "For being a good customer",
      expiresAt: null,
      givenTo: designer.user.id,
      financingAccountId: null,
    });
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
        lineItems: [
          {
            cents: 4_960_00 * 1.2 - 4_960_00,
            description: "Service Fee",
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
            description: "Service Fee",
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
        description: "Service Fee",
        explainerCopy: "A fee for what you produce with us, based on your plan",
      },
      {
        cents: -12_30,
        description: "Credit Applied",
        explainerCopy: null,
      },
    ],
    financingItems: [],
    subtotalCents: 7_106_00,
    dueNowCents: 7_106_00 * 1.2 - 12_30,
    dueLaterCents: 0,
    creditAppliedCents: 12_30,
    balanceDueCents: 7_106_00 * 1.2 - 12_30,
    totalUnits: 100 + 100,
  });
});

test("getCartDetails: with partial credit and full financing", async (t: Test) => {
  const {
    collectionDesigns,
    user: { designer, admin },
    team,
  } = await costCollection();
  let financingAccount: FinancingAccountDb;
  await db.transaction(async (trx: Knex.Transaction) => {
    financingAccount = await FinancingAccountsDAO.create(trx, {
      closedAt: null,
      createdAt: new Date(),
      creditLimitCents: 25_000_00,
      feeBasisPoints: 1000,
      id: uuid.v4(),
      teamId: team.id,
      termLengthDays: 90,
    });
    await CreditsDAO.create(trx, {
      type: CreditType.MANUAL,
      creditDeltaCents: 1230,
      createdBy: admin.user.id,
      description: "For being a good customer",
      expiresAt: null,
      givenTo: designer.user.id,
      financingAccountId: null,
    });
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
        lineItems: [
          {
            cents: 4_960_00 * 0.2,
            description: "Service Fee",
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
            cents: 2_146_00 * 0.2,
            description: "Service Fee",
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
        cents: 7_106_00 * 0.2,
        description: "Service Fee",
        explainerCopy: "A fee for what you produce with us, based on your plan",
      },
      {
        cents: -12_30,
        description: "Credit Applied",
        explainerCopy: null,
      },
      {
        cents: Math.round((7_106_00 * 1.2 - 12_30) * 0.1),
        description: "Financing Fee",
        explainerCopy:
          "CALA Financing allows you to defer payment for your designs. You owe the total amount to CALA within the term defined in your Agreement",
      },
    ],
    financingItems: [
      {
        accountId: financingAccount!.id,
        financedAmountCents: Math.round(7_106_00 * 1.2 - 12_30),
        feeAmountCents: Math.round((7_106_00 * 1.2 - 12_30) * 0.1),
        termLengthDays: financingAccount!.termLengthDays,
      },
    ],
    subtotalCents: 7_106_00,
    dueNowCents: 0,
    dueLaterCents: Math.round((7_106_00 * 1.2 - 12_30) * 1.1),
    creditAppliedCents: 12_30,
    balanceDueCents: 0,
    totalUnits: 100 + 100,
  });
});

test("getCartDetails: with partial credit with partial financing", async (t: Test) => {
  const {
    collectionDesigns,
    user: { designer, admin },
    team,
  } = await costCollection();
  let financingAccount: FinancingAccountDb;
  await db.transaction(async (trx: Knex.Transaction) => {
    financingAccount = await FinancingAccountsDAO.create(trx, {
      closedAt: null,
      createdAt: new Date(),
      creditLimitCents: 500000,
      feeBasisPoints: 1000,
      id: uuid.v4(),
      teamId: team.id,
      termLengthDays: 90,
    });
    await CreditsDAO.create(trx, {
      type: CreditType.MANUAL,
      creditDeltaCents: 1230,
      createdBy: admin.user.id,
      description: "For being a good customer",
      expiresAt: null,
      givenTo: designer.user.id,
      financingAccountId: null,
    });
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
        lineItems: [
          {
            cents: Math.round(4_960_00 * 0.2),
            description: "Service Fee",
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
            cents: Math.round(2_146_00 * 0.2),
            description: "Service Fee",
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
        cents: Math.round(7_106_00 * 0.2),
        description: "Service Fee",
        explainerCopy: "A fee for what you produce with us, based on your plan",
      },
      {
        cents: -12_30,
        description: "Credit Applied",
        explainerCopy: null,
      },
      {
        cents: Math.round((5_000_00 / 1.1) * 0.1),
        description: "Financing Fee",
        explainerCopy:
          "CALA Financing allows you to defer payment for your designs. You owe the total amount to CALA within the term defined in your Agreement",
      },
    ],
    financingItems: [
      {
        accountId: financingAccount!.id,
        financedAmountCents: Math.round(5_000_00 / 1.1),
        feeAmountCents: Math.round((5_000_00 / 1.1) * 0.1),
        termLengthDays: financingAccount!.termLengthDays,
      },
    ],
    subtotalCents: 7_106_00,
    dueNowCents:
      Math.round(7_106_00 * 1.2) - 12_30 - Math.round(5_000_00 / 1.1),
    dueLaterCents: 5_000_00,
    creditAppliedCents: 12_30,
    balanceDueCents:
      Math.round(7_106_00 * 1.2) - 12_30 - Math.round(5_000_00 / 1.1),
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
            description: "Service Fee",
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
            description: "Service Fee",
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
        description: "Service Fee",
        explainerCopy: "A fee for what you produce with us, based on your plan",
      },
      {
        cents: -12_30,
        description: "Credit Applied",
        explainerCopy: null,
      },
    ],
    financingItems: [],
    subtotalCents: 7_106_00,
    dueNowCents: 7_106_00 * 1.2 - 12_30,
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
            description: "Service Fee",
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
            description: "Service Fee",
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
        description: "Service Fee",
        explainerCopy: "A fee for what you produce with us, based on your plan",
      },
      {
        cents: 7_106_00 * -1.2,
        description: "Credit Applied",
        explainerCopy: null,
      },
    ],
    financingItems: [],
    subtotalCents: 7_106_00,
    dueNowCents: 0,
    dueLaterCents: 0,
    creditAppliedCents: 7_106_00 * 1.2,
    balanceDueCents: 0,
    totalUnits: 100 + 100,
  });
});

test("getCartDetails: design with no units", async (t: Test) => {
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
        { designId: collectionDesigns[1].id, units: 0 },
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
        payLaterTotalCents: 0,
        payNowTotalCents: 0,
        timeTotalMs: 0,
        units: 0,
      },
    ],
    financingItems: [],
    combinedLineItems: [],
    subtotalCents: 4_960_00,
    dueNowCents: 4_960_00,
    dueLaterCents: 0,
    creditAppliedCents: 0,
    balanceDueCents: 4_960_00,
    totalUnits: 100,
  });
});
