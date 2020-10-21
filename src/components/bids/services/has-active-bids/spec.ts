import Knex from "knex";

import { hasActiveBids } from "./index";
import { sandbox, test, Test } from "../../../../test-helpers/fresh";
import * as BidsDAO from "../../dao";
import generateBid from "../../../../test-helpers/factories/bid";
import generateDesignEvent from "../../../../test-helpers/factories/design-event";
import { BidWithEvents } from "../../types";
import db from "../../../../services/db";

test("hasActiveBids can determine the state for a user and quote", async (t: Test) => {
  const { bid: bid1 } = await generateBid();
  const { bid: bid2 } = await generateBid({ generatePricing: false });
  const { designEvent: e1 } = await generateDesignEvent({
    bidId: bid1.id,
    type: "BID_DESIGN",
  });
  const { designEvent: e2 } = await generateDesignEvent({
    bidId: bid1.id,
    type: "ACCEPT_SERVICE_BID",
  });
  const bidWithEvent1: BidWithEvents = { ...bid1, designEvents: [e1, e2] };
  const bidWithEvent2: BidWithEvents = { ...bid2, designEvents: [] };
  const bidAndEventList = [bidWithEvent1, bidWithEvent2];
  const findAllStub = sandbox()
    .stub(BidsDAO, "findAllByQuoteAndTargetId")
    .resolves(bidAndEventList);

  const result = await db.transaction((trx: Knex.Transaction) =>
    hasActiveBids(trx, "abc-123", "xyz-456")
  );
  t.true(result, "Has an active bid");
  t.equal(findAllStub.callCount, 1, "Calls the stub just once");
});

test("hasActiveBids can determine the state for a user and quote", async (t: Test) => {
  const { bid: bid1 } = await generateBid();
  const { bid: bid2 } = await generateBid({
    generatePricing: false,
  });
  const { designEvent: e1 } = await generateDesignEvent({
    bidId: bid1.id,
    type: "BID_DESIGN",
  });
  const { designEvent: e2 } = await generateDesignEvent({
    bidId: bid1.id,
    type: "REJECT_SERVICE_BID",
  });
  const bidWithEvent1: BidWithEvents = { ...bid1, designEvents: [e1, e2] };
  const bidWithEvent2: BidWithEvents = { ...bid2, designEvents: [] };
  const bidAndEventList = [bidWithEvent1, bidWithEvent2];
  const findAllStub = sandbox()
    .stub(BidsDAO, "findAllByQuoteAndTargetId")
    .resolves(bidAndEventList);

  const result = await db.transaction((trx: Knex.Transaction) =>
    hasActiveBids(trx, "abc-123", "xyz-456")
  );
  t.false(result, "Does not have an active bid");
  t.equal(findAllStub.callCount, 1, "Calls the stub just once");
});
