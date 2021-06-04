import Knex from "knex";
import { sum } from "lodash";

import UnauthorizedError from "../../errors/unauthorized";
import * as PlansDAO from "../plans/dao";
import { CartDetails, DesignQuote, DesignQuoteLineItem } from "./types";
import {
  UnsavedQuote,
  CreateQuotePayload,
  createUnsavedQuote,
} from "../../services/generate-pricing-quote";
import * as PricingCostInputsDAO from "../pricing-cost-inputs/dao";
import { PricingCostInput } from "../pricing-cost-inputs/types";
import db from "../../services/db";
import { CreditsDAO } from "../credits";
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

export async function getCartDetails(
  trx: Knex.Transaction,
  quoteRequests: CreateQuotePayload[],
  userId: string
): Promise<CartDetails> {
  const quotes: DesignQuote[] = await quoteRequests.reduce(
    async (
      designQuotes: Promise<DesignQuote[]>,
      { designId, units }: CreateQuotePayload
    ) => {
      const existing = await designQuotes;
      const costInputs = await PricingCostInputsDAO.findByDesignId({
        designId,
        trx,
      });

      if (costInputs.length === 0) {
        return existing;
      }

      const latestCostInput = costInputs[0];

      const designQuote = await calculateDesignQuote(latestCostInput, units);

      return [...existing, designQuote];
    },
    Promise.resolve([])
  );

  const { subtotalCents, combinedLineItems, totalUnits } = quotes.reduce(
    (
      acc: {
        subtotalCents: number;
        combinedLineItems: DesignQuoteLineItem[];
        totalUnits: number;
      },
      quote: DesignQuote
    ) => {
      let combined = acc.combinedLineItems;

      for (const lineItem of quote.lineItems) {
        const existingLineItemIndex = combined.findIndex(
          (existing: DesignQuoteLineItem) =>
            existing.description === lineItem.description
        );

        if (existingLineItemIndex === -1) {
          combined = [...combined, lineItem];
        } else {
          combined = [
            ...combined.slice(0, existingLineItemIndex),
            {
              description: lineItem.description,
              explainerCopy: lineItem.explainerCopy,
              cents: combined[existingLineItemIndex].cents + lineItem.cents,
            },
            ...combined.slice(existingLineItemIndex + 1),
          ];
        }
      }
      return {
        subtotalCents: acc.subtotalCents + quote.payNowTotalCents,
        totalUnits: acc.totalUnits + quote.units,
        combinedLineItems: combined,
      };
    },
    {
      subtotalCents: 0,
      combinedLineItems: [],
      totalUnits: 0,
    }
  );

  const dueNowCents =
    subtotalCents +
    combinedLineItems.reduce(
      (cents: number, li: DesignQuoteLineItem) => cents + li.cents,
      0
    );

  const availableCreditCents = await CreditsDAO.getCreditAmount(userId, trx);
  const creditAppliedCents = Math.min(dueNowCents, availableCreditCents);

  const balanceDueCents = dueNowCents - creditAppliedCents;

  if (creditAppliedCents > 0) {
    combinedLineItems.push({
      description: "Credit Applied",
      explainerCopy: null,
      cents: creditAppliedCents * -1,
    });
  }

  return {
    quotes,
    combinedLineItems,
    subtotalCents,
    dueNowCents,
    dueLaterCents: 0, // Placeholder for showing financing fees, etc
    creditAppliedCents,
    balanceDueCents,
    totalUnits,
  };
}
