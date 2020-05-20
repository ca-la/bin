import { PricingQuote } from "../../domain-objects/pricing-quote";
import { sum } from "lodash";

const BUFFER_PERCENT = 0.15;

// time should be a non-negative integer
export default function addTimeBuffer(numericTime: number): number {
  return Math.round(numericTime / (1 - BUFFER_PERCENT));
}

/**
 * getTimeBuffer takes a quote and returns the total amount of time buffer for the design
 *
 * This function helps the timeline feature determine how much additional buffer should
 * be added to the timeline of a design
 */
export function getTimeBuffer(quote: PricingQuote): number {
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
  return Math.round(
    timeTotalMsWithoutBuffer / (1 - BUFFER_PERCENT) - timeTotalMsWithoutBuffer
  );
}
