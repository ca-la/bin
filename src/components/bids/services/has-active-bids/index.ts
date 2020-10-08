import Knex from "knex";
import { findAllByQuoteAndTargetId } from "../../dao";
import { BidWithEvents } from "../../domain-object";
import { BidState, determineStateFromEvents } from "../state-machine";

export function isActiveBid(bidWithEvent: BidWithEvents): boolean {
  const { designEvents, ...bid } = bidWithEvent;
  const bidState = determineStateFromEvents(bid, designEvents);
  return bidState === BidState.ACCEPTED || bidState === BidState.OPEN;
}

/**
 * Determines if the given quote has at least one active (open or accepted) bids for the given user/team.
 * @param quoteId
 * @param targetId User or Team ID
 */
export async function hasActiveBids(
  trx: Knex.Transaction,
  quoteId: string,
  targetId: string
): Promise<boolean> {
  const bidsWithEvents = await findAllByQuoteAndTargetId(
    trx,
    quoteId,
    targetId
  );

  return bidsWithEvents.some(isActiveBid);
}
