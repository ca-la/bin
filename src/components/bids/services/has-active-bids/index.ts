import { findAllByQuoteAndUserId } from '../../dao';
import { BidWithEvents } from '../../domain-object';
import { BidState, determineStateFromEvents } from '../state-machine';

export function isActiveBid(bidWithEvent: BidWithEvents): boolean {
  const { designEvents, ...bid } = bidWithEvent;
  const bidState = determineStateFromEvents(bid, designEvents);
  return bidState === BidState.ACCEPTED || bidState === BidState.OPEN;
}

/**
 * Determines if the given quote has at least one active (open or accepted) bids for the given user.
 * @param quoteId
 * @param userId
 */
export async function hasActiveBids(quoteId: string, userId: string): Promise<boolean> {
  const bidsWithEvents = await findAllByQuoteAndUserId(quoteId, userId);

  return bidsWithEvents.some(isActiveBid);
}
