import Knex from "knex";
import { test, Test } from "../../test-helpers/fresh";
import generatePricingValues from "../../test-helpers/factories/pricing-values";
import createUser from "../../test-helpers/create-user";
import generatePricingQuote from "../../services/generate-pricing-quote";
import { daysToMs } from "../../services/time-conversion";
import db from "../../services/db";
import uuid = require("node-uuid");
import { create as createBid } from "../bids/dao";
import { create, findByBidId } from "./dao";
import { generateDesign } from "../../test-helpers/factories/product-design";
import { BidDb } from "../bids/types";
import generateCollection from "../../test-helpers/factories/collection";

test("Bid Rejections DAO supports creation and retrieval by Bid ID", async (t: Test) => {
  await generatePricingValues();
  const { user } = await createUser();
  const { collection } = await generateCollection();
  const design = await generateDesign({
    userId: user.id,
    collectionIds: [collection.id],
  });
  const quote = await generatePricingQuote(
    {
      createdAt: new Date(2012, 11, 22),
      deletedAt: null,
      expiresAt: null,
      id: uuid.v4(),
      minimumOrderQuantity: 1,
      designId: design.id,
      materialBudgetCents: 1200,
      materialCategory: "BASIC",
      processes: [
        {
          complexity: "1_COLOR",
          name: "SCREEN_PRINTING",
        },
        {
          complexity: "1_COLOR",
          name: "SCREEN_PRINTING",
        },
      ],
      productComplexity: "SIMPLE",
      productType: "TEESHIRT",
      processTimelinesVersion: 0,
      processesVersion: 0,
      productMaterialsVersion: 0,
      productTypeVersion: 0,
      marginVersion: 0,
      constantsVersion: 0,
      careLabelsVersion: 0,
    },
    200
  );
  const inputBid: BidDb = {
    bidPriceCents: 100000,
    bidPriceProductionOnlyCents: 0,
    createdBy: user.id,
    description: "Full Service",
    dueDate: new Date(new Date(2012, 11, 22).getTime() + daysToMs(10)),
    id: uuid.v4(),
    quoteId: quote.id,
    revenueShareBasisPoints: 0,
    createdAt: new Date(2012, 11, 22),
  };
  await db.transaction((trx: Knex.Transaction) => createBid(trx, inputBid));

  const rejectionReasons = {
    id: uuid.v4(),
    createdAt: new Date(),
    createdBy: user.id,
    bidId: inputBid.id,
    priceTooLow: true,
    deadlineTooShort: false,
    missingInformation: false,
    other: true,
    notes: "Material sourcing not possible",
  };
  const created = await create(rejectionReasons);
  const foundById = await findByBidId(rejectionReasons.bidId);
  t.deepEqual(rejectionReasons, created);
  t.deepEqual(rejectionReasons, foundById);
});
