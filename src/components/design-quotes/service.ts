import UnauthorizedError from "../../errors/unauthorized";
import * as PlansDAO from "../plans/dao";
import { DesignQuote, DesignQuoteLineItem } from "./types";
import {
  calculateAmounts,
  generateUnsavedQuote,
} from "../../services/generate-pricing-quote";
import { PricingCostInput } from "../pricing-cost-inputs/types";
import db from "../../services/db";

export async function getDesignProductionFeeBasisPoints(designId: string) {
  const plan = await PlansDAO.findLatestDesignTeamPlan(db, designId);
  if (!plan) {
    throw new UnauthorizedError("No active subscriptions for this team");
  }

  return plan.costOfGoodsShareBasisPoints;
}

export async function calculateDesignQuote(
  costInput: PricingCostInput,
  units: number
): Promise<DesignQuote> {
  const productionFeeBasisPoints = await getDesignProductionFeeBasisPoints(
    costInput.designId
  );
  const unsavedQuote = await generateUnsavedQuote(
    costInput,
    units,
    productionFeeBasisPoints
  );
  const {
    payLaterTotalCents,
    payNowTotalCents,
    timeTotalMs,
  } = calculateAmounts(unsavedQuote);

  const lineItems: DesignQuoteLineItem[] = [];

  if (unsavedQuote.productionFeeCents > 0) {
    lineItems.push({
      description: "Production Fee",
      cents: unsavedQuote.productionFeeCents,
    });
  }

  return {
    designId: costInput.designId,
    payLaterTotalCents,
    payNowTotalCents,
    timeTotalMs,
    units,
    minimumOrderQuantity: costInput.minimumOrderQuantity,
    lineItems,
  };
}
