import { sum } from "lodash";

import UnauthorizedError from "../../errors/unauthorized";
import * as PlansDAO from "../plans/dao";
import { DesignQuote, DesignQuoteLineItem } from "./types";
import {
  UnsavedQuote,
  createUnsavedQuote,
} from "../../services/generate-pricing-quote";
import { PricingCostInput } from "../pricing-cost-inputs/types";
import db from "../../services/db";
import addMargin from "../../services/add-margin";
import { FINANCING_MARGIN } from "../../config";
import addTimeBuffer from "../../services/add-time-buffer";

export function calculateAmounts(
  quote: UnsavedQuote
): {
  payNowTotalCents: number;
  payLaterTotalCents: number;
  timeTotalMs: number;
} {
  const payNowTotalCents = quote.units * quote.unitCostCents;
  const payLaterTotalCents = addMargin(payNowTotalCents, FINANCING_MARGIN);
  const timeTotalMsWithoutBuffer = sum([
    quote.creationTimeMs,
    quote.specificationTimeMs,
    quote.sourcingTimeMs,
    quote.samplingTimeMs,
    quote.preProductionTimeMs,
    quote.processTimeMs,
    quote.productionTimeMs,
    quote.fulfillmentTimeMs,
  ]);
  const timeTotalMs = addTimeBuffer(timeTotalMsWithoutBuffer);
  return { payNowTotalCents, payLaterTotalCents, timeTotalMs };
}

export async function getDesignProductionFeeBasisPoints(designId: string) {
  const plan = await PlansDAO.findLatestDesignTeamPlan(db, designId);
  if (!plan) {
    throw new UnauthorizedError("No active subscriptions for this team");
  }

  return plan.costOfGoodsShareBasisPoints;
}

function fromUnsavedQuote(
  quote: UnsavedQuote,
  units: number,
  minimumOrderQuantity: number
): DesignQuote {
  const {
    payLaterTotalCents,
    payNowTotalCents,
    timeTotalMs,
  } = calculateAmounts(quote);

  const lineItems: DesignQuoteLineItem[] = [];

  if (quote.productionFeeCents > 0) {
    lineItems.push({
      description: "Production Fee",
      explainerCopy: "A fee for what you produce with us, based on your plan",
      cents: quote.productionFeeCents,
    });
  }

  return {
    designId: quote.designId!,
    payLaterTotalCents,
    payNowTotalCents,
    timeTotalMs,
    units,
    minimumOrderQuantity,
    lineItems,
  };
}

export async function calculateDesignQuote(
  costInput: PricingCostInput,
  units: number
): Promise<DesignQuote> {
  const productionFeeBasisPoints = await getDesignProductionFeeBasisPoints(
    costInput.designId
  );
  const unsavedQuote = await createUnsavedQuote(
    costInput,
    units,
    productionFeeBasisPoints
  );
  return fromUnsavedQuote(unsavedQuote, units, costInput.minimumOrderQuantity);
}
