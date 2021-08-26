import Knex from "knex";
import uuid from "node-uuid";

import { ApprovalStepType } from "../../components/approval-steps/types";
import {
  DesignEvent,
  templateDesignEvent,
} from "../../components/design-events/types";
import DesignEventsDAO from "../../components/design-events/dao";
import * as PricingCostInputsDAO from "../../components/pricing-cost-inputs/dao";
import db from "../db";

interface DesignIdAndCheckoutStepId {
  designId: string;
  checkoutStepId: string;
}

export async function rejectCollection(collectionId: string, actorId: string) {
  return db.transaction(async (trx: Knex.Transaction) => {
    const collectionDesigns = await trx("product_designs")
      .select<DesignIdAndCheckoutStepId[]>([
        "product_designs.id as designId",
        "design_approval_steps.id as checkoutStepId",
      ])
      .join(
        "collection_designs",
        "collection_designs.design_id",
        "product_designs.id"
      )
      .join(
        "design_approval_steps",
        "design_approval_steps.design_id",
        "product_designs.id"
      )
      .where({
        "product_designs.deleted_at": null,
        "collection_designs.collection_id": collectionId,
        "design_approval_steps.type": ApprovalStepType.CHECKOUT,
      })
      .orderBy("product_designs.created_at", "asc");

    const rejectEvents: DesignEvent[] = [];

    for (const { designId, checkoutStepId } of collectionDesigns) {
      rejectEvents.push({
        ...templateDesignEvent,
        id: uuid.v4(),
        createdAt: new Date(),

        type: "REJECT_DESIGN",
        actorId,
        designId,
        approvalStepId: checkoutStepId,
      });
    }

    if (rejectEvents.length > 0) {
      await DesignEventsDAO.createAll(trx, rejectEvents);
    }

    await PricingCostInputsDAO.expireCostInputs(
      collectionDesigns.map(
        ({ designId }: DesignIdAndCheckoutStepId) => designId
      ),
      new Date(),
      trx
    );

    return rejectEvents;
  });
}
