import uuid from "node-uuid";
import Knex from "knex";

import db from "../services/db";
import * as PricingCostInputsDAO from "../components/pricing-cost-inputs/dao";
import createUser from "./create-user";
import createDesign from "../services/create-design";
import generatePricingValues from "./factories/pricing-values";
import { createQuotes } from "../services/generate-pricing-quote";
import generateCollection from "./factories/collection";

export async function checkout(generatePricing: boolean = true) {
  if (generatePricing) {
    await generatePricingValues();
  }

  const designer = await createUser();
  const admin = await createUser({ role: "ADMIN" });
  const { collection, team } = await generateCollection({
    createdBy: designer.user.id,
  });

  const collectionDesigns = [
    {
      ...(await createDesign({
        productType: "A product type",
        title: "Collection Design 1",
        userId: designer.user.id,
        collectionIds: [collection.id],
      })),
      collectionIds: [collection.id],
      collections: [{ id: collection.id, title: collection.title }],
    },
    {
      ...(await createDesign({
        productType: "A product type",
        title: "Collection Design 2",
        userId: designer.user.id,
        collectionIds: [collection.id],
      })),
      collectionIds: [collection.id],
      collections: [{ id: collection.id, title: collection.title }],
    },
  ];

  const draftDesigns = [
    await createDesign({
      productType: "A product type",
      title: "Draft 1",
      userId: designer.user.id,
    }),
    await createDesign({
      productType: "A product type",
      title: "Draft 2",
      userId: designer.user.id,
    }),
  ];
  const quotes = await db.transaction(async (trx: Knex.Transaction) => {
    await PricingCostInputsDAO.create(trx, {
      createdAt: new Date(),
      deletedAt: null,
      designId: collectionDesigns[0].id,
      expiresAt: null,
      id: uuid.v4(),
      materialBudgetCents: 1200,
      materialCategory: "BASIC",
      minimumOrderQuantity: 1,
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
    });
    await PricingCostInputsDAO.create(trx, {
      createdAt: new Date(),
      deletedAt: null,
      designId: collectionDesigns[1].id,
      expiresAt: null,
      id: uuid.v4(),
      materialBudgetCents: 1200,
      materialCategory: "BASIC",
      minimumOrderQuantity: 1,
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
      productComplexity: "BLANK",
      productType: "TEESHIRT",
    });

    return createQuotes(
      [
        { designId: collectionDesigns[0].id, units: 300 },
        { designId: collectionDesigns[1].id, units: 200 },
      ],
      designer.user.id,
      trx
    );
  });

  return {
    team,
    collection,
    collectionDesigns,
    draftDesigns,
    quotes,
    user: {
      designer,
      admin,
    },
  };
}
