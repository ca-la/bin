import uuid from "node-uuid";
import Knex from "knex";

import db from "../../../../services/db";
import DesignEventsDAO from "../../../design-events/dao";
import DesignsDAO from "../../../product-designs/dao";
import ProductDesign = require("../../../product-designs/domain-objects/product-design");
import ApprovalStepsDAO from "../../../approval-steps/dao";
import ApprovalStep, { ApprovalStepType } from "../../../approval-steps/types";
import {
  attachProcesses,
  create as createCostInput,
  expireCostInputs,
} from "../../../pricing-cost-inputs/dao";
import { getDesignsMetaByCollection } from "../determine-submission-status";
import { PricingCostInputDb } from "../../../pricing-cost-inputs/domain-object";
import { templateDesignEvent } from "../../../design-events/types";
/**
 * Commits cost inputs for every design in the given collection.
 */
export async function commitCostInputs(
  collectionId: string,
  actorId: string
): Promise<void> {
  const designs = await DesignsDAO.findByCollectionId(collectionId);
  const designIds = designs.map((design: ProductDesign): string => design.id);

  await db.transaction(
    async (trx: Knex.Transaction): Promise<void> => {
      const twoWeeksFromNow = new Date();
      twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);
      await expireCostInputs(designIds, twoWeeksFromNow, trx);

      for (const design of designs) {
        const steps = await ApprovalStepsDAO.findByDesign(trx, design.id);
        const checkoutStep = steps.find(
          (step: ApprovalStep) => step.type === ApprovalStepType.CHECKOUT
        );

        if (!checkoutStep) {
          throw new Error(
            `Could not find checkout step for design ${design.id} while commiting costing`
          );
        }

        await DesignEventsDAO.create(trx, {
          ...templateDesignEvent,
          actorId,
          approvalStepId: checkoutStep.id,
          createdAt: new Date(),
          designId: design.id,
          id: uuid.v4(),
          targetId: design.userId,
          type: "COMMIT_COST_INPUTS",
        });
      }
    }
  );
}

/**
 * Re-cost inputs for every design in the expired collection.
 */
export async function recostInputs(collectionId: string): Promise<void> {
  const designs = (await getDesignsMetaByCollection([collectionId]))[
    collectionId
  ];
  await db.transaction(
    async (trx: Knex.Transaction): Promise<void> => {
      for (const design of designs) {
        const costInput = design.costInputs.reduce<PricingCostInputDb | null>(
          (
            latestCost: PricingCostInputDb | null,
            currentCost: PricingCostInputDb
          ) => {
            if (
              !latestCost ||
              new Date(currentCost.createdAt) > new Date(latestCost.createdAt)
            ) {
              return currentCost;
            }
            return latestCost;
          },
          null
        );
        if (!costInput) {
          continue;
        }
        const newCostInputBlank = {
          ...(await attachProcesses<PricingCostInputDb>(costInput)),
          createdAt: new Date(),
          deletedAt: null,
          expiresAt: null,
          id: uuid.v4(),
        };
        await createCostInput(trx, newCostInputBlank);
      }
    }
  );
}
