import uuid from "node-uuid";
import Knex from "knex";

import db from "../services/db";
import * as PricingCostInputsDAO from "../components/pricing-cost-inputs/dao";
import * as VariantsDAO from "../components/product-design-variants/dao";
import createUser from "./create-user";
import createDesign from "../services/create-design";
import generatePricingValues from "./factories/pricing-values";
import generateCollection from "./factories/collection";
import {
  Complexity,
  MaterialCategory,
  ProductType,
  ScreenPrintingComplexity,
} from "../domain-objects/pricing";

const variantBlank = {
  colorName: "Black",
  colorNamePosition: 0,
  isSample: false,
  sku: null,
  unitsToProduce: 25,
  universalProductCode: null,
};

export async function costCollection(generatePricing: boolean = true) {
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
      collections: [{ id: collection.id, title: collection.title! }],
    },
    {
      ...(await createDesign({
        productType: "A product type",
        title: "Collection Design 2",
        userId: designer.user.id,
        collectionIds: [collection.id],
      })),
      collectionIds: [collection.id],
      collections: [{ id: collection.id, title: collection.title! }],
    },
  ];

  const variants = await db.transaction((trx: Knex.Transaction) =>
    Promise.all([
      VariantsDAO.createForDesign(trx, collectionDesigns[0].id, [
        {
          ...variantBlank,
          designId: collectionDesigns[0].id,
          id: uuid.v4(),
          position: 0,
          sizeName: "S",
        },
        {
          ...variantBlank,
          designId: collectionDesigns[0].id,
          id: uuid.v4(),
          position: 1,
          sizeName: "M",
        },
        {
          ...variantBlank,
          designId: collectionDesigns[0].id,
          id: uuid.v4(),
          position: 2,
          sizeName: "L",
        },
        {
          ...variantBlank,
          designId: collectionDesigns[0].id,
          id: uuid.v4(),
          position: 3,
          sizeName: "XL",
        },
      ]),
      VariantsDAO.createForDesign(trx, collectionDesigns[1].id, [
        {
          ...variantBlank,
          designId: collectionDesigns[1].id,
          id: uuid.v4(),
          position: 0,
          sizeName: "S",
        },
        {
          ...variantBlank,
          designId: collectionDesigns[1].id,
          id: uuid.v4(),
          position: 1,
          sizeName: "M",
        },
        {
          ...variantBlank,
          designId: collectionDesigns[1].id,
          id: uuid.v4(),
          position: 2,
          sizeName: "L",
        },
        {
          ...variantBlank,
          designId: collectionDesigns[1].id,
          id: uuid.v4(),
          position: 3,
          sizeName: "XL",
        },
      ]),
    ])
  );

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

  const costInputs = await db.transaction(async (trx: Knex.Transaction) => {
    return Promise.all([
      PricingCostInputsDAO.create(trx, {
        createdAt: new Date(),
        deletedAt: null,
        designId: collectionDesigns[0].id,
        expiresAt: null,
        id: uuid.v4(),
        materialBudgetCents: 1200,
        materialCategory: MaterialCategory.BASIC,
        minimumOrderQuantity: 1,
        processes: [
          {
            complexity: ScreenPrintingComplexity["1_COLOR"],
            name: "SCREEN_PRINT",
          },
          {
            complexity: ScreenPrintingComplexity["1_COLOR"],
            name: "SCREEN_PRINT",
          },
        ],
        productComplexity: Complexity.SIMPLE,
        productType: ProductType.TEESHIRT,
      }),
      PricingCostInputsDAO.create(trx, {
        createdAt: new Date(),
        deletedAt: null,
        designId: collectionDesigns[1].id,
        expiresAt: null,
        id: uuid.v4(),
        materialBudgetCents: 1200,
        materialCategory: MaterialCategory.BASIC,
        minimumOrderQuantity: 1,
        processes: [
          {
            complexity: ScreenPrintingComplexity["1_COLOR"],
            name: "SCREEN_PRINT",
          },
          {
            complexity: ScreenPrintingComplexity["1_COLOR"],
            name: "SCREEN_PRINT",
          },
        ],
        productComplexity: Complexity.BLANK,
        productType: ProductType.TEESHIRT,
      }),
    ]);
  });

  return {
    team,
    collection,
    collectionDesigns,
    draftDesigns,
    costInputs,
    variants,
    user: {
      designer,
      admin,
    },
  };
}
