import uuid from "node-uuid";
import Knex from "knex";

import db from "../services/db";
import * as CollectionsDAO from "../components/collections/dao";
import * as PricingCostInputsDAO from "../components/pricing-cost-inputs/dao";
import createUser from "./create-user";
import createDesign from "../services/create-design";
import { addDesigns } from "../components/collections/dao/design";
import ProductDesign from "../components/product-designs/domain-objects/product-design";
import generatePricingValues from "./factories/pricing-values";
import generatePricingQuote from "../services/generate-pricing-quote";

export async function checkout() {
  const designer = await createUser();
  const admin = await createUser({ role: "ADMIN" });
  const collection = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: designer.user.id,
    deletedAt: null,
    description: "Initial commit",
    id: uuid.v4(),
    title: "Drop 001/The Early Years",
  });

  const collectionDesigns = [
    {
      ...(await createDesign({
        productType: "A product type",
        title: "Collection Design 1",
        userId: designer.user.id,
      })),
      collectionIds: [collection.id],
      collections: [{ id: collection.id, title: collection.title! }],
    },
    {
      ...(await createDesign({
        productType: "A product type",
        title: "Collection Design 2",
        userId: designer.user.id,
      })),
      collectionIds: [collection.id],
      collections: [{ id: collection.id, title: collection.title! }],
    },
  ];
  await addDesigns({
    collectionId: collection.id,
    designIds: collectionDesigns.map((cd: ProductDesign) => cd.id),
  });

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
  await generatePricingValues();
  await db.transaction(async (trx: Knex.Transaction) => {
    await PricingCostInputsDAO.create(trx, {
      createdAt: new Date(),
      deletedAt: null,
      designId: collectionDesigns[0].id,
      expiresAt: null,
      id: uuid.v4(),
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
    });
    await PricingCostInputsDAO.create(trx, {
      createdAt: new Date(),
      deletedAt: null,
      designId: collectionDesigns[1].id,
      expiresAt: null,
      id: uuid.v4(),
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
      productComplexity: "BLANK",
      productType: "TEESHIRT",
    });
  });

  const quotes = [
    await generatePricingQuote({
      designId: collectionDesigns[0].id,
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
      units: 300,
      processTimelinesVersion: 0,
      processesVersion: 0,
      productMaterialsVersion: 0,
      productTypeVersion: 0,
      marginVersion: 0,
      constantsVersion: 0,
      careLabelsVersion: 0,
    }),
    await generatePricingQuote({
      designId: collectionDesigns[1].id,
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
      productComplexity: "BLANK",
      productType: "TEESHIRT",
      units: 200,
      processTimelinesVersion: 0,
      processesVersion: 0,
      productMaterialsVersion: 0,
      productTypeVersion: 0,
      marginVersion: 0,
      constantsVersion: 0,
      careLabelsVersion: 0,
    }),
  ];

  return {
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
