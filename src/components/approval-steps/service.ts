import Knex from "knex";
import { PricingQuote } from "../../domain-objects/pricing-quote";
import { find, update } from "./dao";
import { ApprovalStepType } from "./types";

type PricingQuoteTimeKeys = Extract<
  | "specificationTimeMs"
  | "sourcingTimeMs"
  | "samplingTimeMs"
  | "preProductionTimeMs"
  | "productionTimeMs"
  | "fulfillmentTimeMs",
  PricingQuote[keyof PricingQuote]
>;

const TIMING_SOURCES: Record<ApprovalStepType, PricingQuoteTimeKeys[]> = {
  [ApprovalStepType.CHECKOUT]: [],
  [ApprovalStepType.TECHNICAL_DESIGN]: ["specificationTimeMs"],
  [ApprovalStepType.SAMPLE]: [
    "specificationTimeMs",
    "sourcingTimeMs",
    "samplingTimeMs",
  ],
  [ApprovalStepType.PRODUCTION]: [
    "specificationTimeMs",
    "sourcingTimeMs",
    "samplingTimeMs",
    "preProductionTimeMs",
    "productionTimeMs",
    "fulfillmentTimeMs",
  ],
};

export async function setApprovalStepsDueAtByPricingQuote(
  trx: Knex.Transaction,
  quote: PricingQuote,
  baseDate: Date = new Date()
): Promise<void> {
  const baseDateMs = baseDate.getTime();
  if (!quote.designId) {
    return;
  }
  const steps = await find(trx, { designId: quote.designId });

  for (const step of steps) {
    if (!TIMING_SOURCES[step.type]) {
      continue;
    }
    const offsetMs = TIMING_SOURCES[step.type].reduce(
      (acc: number, timeSource: PricingQuoteTimeKeys) => {
        return acc + (quote[timeSource] || 0);
      },
      0
    );
    await update(trx, step.id, {
      dueAt: new Date(baseDateMs + offsetMs),
    });
  }
}
