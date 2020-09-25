import uuid from "node-uuid";
import Knex from "knex";

import generatePricingValues from "./pricing-values";
import generatePricingQuote from "../../services/generate-pricing-quote";

import { PricingQuote } from "../../domain-objects/pricing-quote";
import * as PricingQuotesDAO from "../../dao/pricing-quotes";
import Bid from "../../components/bids/domain-object";
import { createBid } from "../../services/create-bid";
import createUser from "../create-user";
import User from "../../components/users/domain-object";
import { daysToMs } from "../../services/time-conversion";
import db from "../../services/db";
import ProductDesignsDAO from "../../components/product-designs/dao";
import { generateDesign } from "./product-design";
import { BidDb } from "../../components/bids/types";

interface BidInterface {
  user: User;
  quote: PricingQuote;
  bid: Bid;
}

interface GenerateBidInputs {
  bidOptions: Partial<BidDb>;
  quoteId: string | null;
  designId: string;
  generatePricing: boolean;
  userId: string | null;
  taskTypeIds: string[];
}

export default async function generateBid({
  bidOptions = {},
  designId,
  quoteId = null,
  generatePricing = true,
  userId = null,
  taskTypeIds = [],
}: Partial<GenerateBidInputs> = {}): Promise<BidInterface> {
  if (generatePricing) {
    await generatePricingValues();
  }
  const { user } = await createUser();

  let design;
  const found = designId ? await ProductDesignsDAO.findById(designId) : null;
  if (found) {
    design = found;
  } else {
    design = await generateDesign({ userId: user.id });
  }

  const createdBy = userId || user.id;

  const quote = quoteId
    ? await PricingQuotesDAO.findById(quoteId)
    : await generatePricingQuote(
        {
          createdAt: new Date(),
          deletedAt: null,
          expiresAt: null,
          id: uuid.v4(),
          minimumOrderQuantity: 1,
          designId: design.id,
          materialBudgetCents: 1200,
          materialCategory: "BASIC",
          processes: [],
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

  if (!quote) {
    throw new Error("Could not find or create quote for new pricing bid");
  }

  const {
    bidPriceCents = 100000,
    bidPriceProductionOnlyCents = 0,
    createdAt = new Date(),
    description = "Full Service",
    dueDate,
    revenueShareBasisPoints = 0,
  } = bidOptions;
  const bidId = bidOptions.id || uuid.v4();
  const bid = await db.transaction((trx: Knex.Transaction) =>
    createBid(trx, bidId, createdBy, {
      bidPriceCents,
      bidPriceProductionOnlyCents,
      description: description || "Full Service",
      dueDate: (
        dueDate || new Date(createdAt.getTime() + daysToMs(10))
      ).toISOString(),
      projectDueInMs: 0,
      quoteId: bidOptions.quoteId || quote.id,
      revenueShareBasisPoints,
      taskTypeIds,
    })
  );

  return { bid, quote, user };
}
