import uuid from "node-uuid";

import db from "../services/db";
import * as PricingCostInputsDAO from "../components/pricing-cost-inputs/dao";
import * as DesignEventsDAO from "../components/design-events/dao";
import {
  Complexity,
  MaterialCategory,
  ProductType,
  ScreenPrintingComplexity,
} from "../domain-objects/pricing";
import { templateDesignEvent } from "../components/design-events/types";
import { submitCollection } from "./submit-collection";

export async function costCollection(generatePricing: boolean = true) {
  const submitted = await submitCollection(generatePricing);
  const {
    collectionDesigns,
    user: { admin },
  } = submitted;

  const trx = await db.transaction();

  try {
    const costInputs = await Promise.all([
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
    const designEvents = await DesignEventsDAO.createAll(trx, [
      {
        ...templateDesignEvent,
        actorId: admin.user.id,
        id: uuid.v4(),
        createdAt: new Date(),
        type: "COMMIT_COST_INPUTS",
        designId: collectionDesigns[0].id,
      },
      {
        ...templateDesignEvent,
        actorId: admin.user.id,
        id: uuid.v4(),
        createdAt: new Date(),
        type: "COMMIT_COST_INPUTS",
        designId: collectionDesigns[1].id,
      },
    ]);

    await trx.commit();

    return {
      ...submitted,
      costInputs,
      designEvents: submitted.designEvents.concat(designEvents),
    };
  } catch (err) {
    await trx.rollback();
    throw err;
  }
}
