import Knex from "knex";

import Bid, { BidCreationPayload } from "../../components/bids/domain-object";
import * as BidsDAO from "../../components/bids/dao";
import * as BidTaskTypesDAO from "../../components/bid-task-types/dao";

export async function createBid(
  trx: Knex.Transaction,
  bidId: string,
  actorId: string,
  bidCreationRequest: BidCreationPayload
): Promise<Bid> {
  const bid = await BidsDAO.create(trx, {
    bidPriceCents: bidCreationRequest.bidPriceCents,
    bidPriceProductionOnlyCents: bidCreationRequest.bidPriceProductionOnlyCents,
    createdBy: actorId,
    description: bidCreationRequest.description,
    dueDate: new Date(bidCreationRequest.dueDate),
    id: bidId,
    quoteId: bidCreationRequest.quoteId,
    revenueShareBasisPoints: bidCreationRequest.revenueShareBasisPoints,
    createdAt: new Date(),
  });

  for (const taskTypeId of bidCreationRequest.taskTypeIds) {
    await BidTaskTypesDAO.create(
      {
        pricingBidId: bidId,
        taskTypeId,
      },
      trx
    );
  }

  // TODO: Assign team or user to bid within this transaction

  return bid;
}
