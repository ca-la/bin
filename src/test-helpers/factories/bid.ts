import uuid from "node-uuid";
import Knex from "knex";

import generatePricingValues from "./pricing-values";

import { PricingQuote } from "../../domain-objects/pricing-quote";
import * as PricingCostInputsDAO from "../../components/pricing-cost-inputs/dao";
import * as PricingQuotesDAO from "../../dao/pricing-quotes";
import * as CollectionsDAO from "../../components/collections/dao";
import { Bid, BidCreationPayload } from "../../components/bids/types";
import { createBid } from "../../services/create-bid";
import createUser from "../create-user";
import User from "../../components/users/domain-object";
import { daysToMs } from "../../services/time-conversion";
import db from "../../services/db";
import ProductDesignsDAO from "../../components/product-designs/dao";
import DesignEventsDAO from "../../components/design-events/dao";
import * as BidsDAO from "../../components/bids/dao";
import * as BidTaskTypesDAO from "../../components/bid-task-types/dao";
import { templateDesignEvent } from "../../components/design-events/types";
import { generateDesign } from "./product-design";
import { BidTaskTypeId } from "../../components/bid-task-types/types";
import generateCollection from "./collection";
import { createQuotes } from "../../services/generate-pricing-quote";
import ProductDesign from "../../components/product-designs/domain-objects/product-design";

interface BidInterface {
  user: User;
  quote: PricingQuote;
  bid: Bid;
}

interface GenerateBidInputs {
  bidOptions: Partial<BidCreationPayload>;
  quoteId: string | null;
  designId: string;
  generatePricing: boolean;
  userId: string | null;
  taskTypeIds: string[];
  collectionId: string;
}

export default async function generateBid({
  bidOptions = {},
  designId,
  quoteId = null,
  generatePricing = true,
  userId = null,
  taskTypeIds = [],
  collectionId,
}: Partial<GenerateBidInputs> = {}): Promise<BidInterface> {
  if (generatePricing) {
    await generatePricingValues();
  }
  const { user } = await createUser({ role: "ADMIN", withSession: false });

  const { collection } = collectionId
    ? { collection: await CollectionsDAO.findById(collectionId) }
    : await generateCollection();

  if (!collection) {
    throw new Error("Could not find or create collection for design");
  }

  let design: ProductDesign;
  const found = designId ? await ProductDesignsDAO.findById(designId) : null;
  if (found) {
    design = found;
  } else {
    design = await generateDesign({
      userId: user.id,
      collectionIds: [collection.id],
    });
  }

  const createdBy = userId || user.id;

  const quote = quoteId
    ? await PricingQuotesDAO.findById(quoteId)
    : await db
        .transaction(async (trx: Knex.Transaction) => {
          await PricingCostInputsDAO.create(trx, {
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
          });

          return createQuotes(
            [{ designId: design.id, units: 200 }],
            createdBy,
            trx
          );
        })
        .then((quotes: PricingQuote[]) => quotes[0]);

  if (!quote) {
    throw new Error("Could not find or create quote for new pricing bid");
  }

  const bid = await db.transaction((trx: Knex.Transaction) =>
    createBid(trx, uuid.v4(), createdBy, {
      assignee: {
        type: "USER",
        id: createdBy,
      },
      bidPriceCents: 100000,
      bidPriceProductionOnlyCents: 0,
      description: "Full Service",
      dueDate: new Date(new Date().getTime() + daysToMs(10)).toISOString(),
      projectDueInMs: 0,
      quoteId: quote.id,
      revenueShareBasisPoints: 0,
      taskTypeIds,
      ...bidOptions,
    })
  );
  return { bid, quote, user };
}

export async function bidDesign({
  actorId,
  targetId,
  targetTeamId,
  designId,
  bidTaskTypeIds,
  quoteId = null,
  now = new Date(),
}: {
  actorId: string;
  targetId: string | null;
  targetTeamId: string | null;
  designId: string;
  bidTaskTypeIds: BidTaskTypeId[];
  quoteId?: string | null;
  now?: Date;
}) {
  await generatePricingValues();
  const quote = quoteId
    ? await PricingQuotesDAO.findById(quoteId)
    : await db
        .transaction(async (trx: Knex.Transaction) => {
          await PricingCostInputsDAO.create(trx, {
            createdAt: new Date(),
            deletedAt: null,
            expiresAt: null,
            id: uuid.v4(),
            minimumOrderQuantity: 1,
            designId,
            materialBudgetCents: 1200,
            materialCategory: "BASIC",
            processes: [],
            productComplexity: "SIMPLE",
            productType: "TEESHIRT",
          });
          return createQuotes([{ designId, units: 200 }], actorId, trx);
        })
        .then((quotes: PricingQuote[]) => quotes[0]);
  if (!quote) {
    throw new Error("Could not find or create quote when bidding");
  }

  return db.transaction(async (trx: Knex.Transaction) => {
    const bid = await BidsDAO.create(trx, {
      revenueShareBasisPoints: 10,
      bidPriceCents: 100000,
      bidPriceProductionOnlyCents: 0,
      createdBy: actorId,
      description: "Full Service",
      dueDate: new Date(now.getTime() + daysToMs(10)),
      id: uuid.v4(),
      quoteId: quote.id,
      createdAt: now,
    });
    for (const taskTypeId of bidTaskTypeIds) {
      await BidTaskTypesDAO.create({ pricingBidId: bid.id, taskTypeId }, trx);
    }
    await DesignEventsDAO.create(trx, {
      ...templateDesignEvent,
      type: "BID_DESIGN",
      actorId,
      designId,
      bidId: bid.id,
      targetId,
      targetTeamId,
      id: uuid.v4(),
      createdAt: now,
    });

    return { bid, quote };
  });
}
