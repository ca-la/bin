import Knex from "knex";
import { test, Test } from "../../test-helpers/fresh";
import createUser from "../../test-helpers/create-user";
import { daysToMs } from "../../services/time-conversion";
import db from "../../services/db";
import uuid = require("node-uuid");
import { create as createBid } from "../bids/dao";
import { create, findByBidId } from "./dao";
import { BidDb } from "../bids/types";
import { checkout } from "../../test-helpers/checkout-collection";

test("Bid Rejections DAO supports creation and retrieval by Bid ID", async (t: Test) => {
  const {
    quotes: [quote],
    user: { admin },
  } = await checkout();
  const partner = await createUser({ role: "PARTNER", withSession: false });
  const inputBid: BidDb = {
    bidPriceCents: 100000,
    bidPriceProductionOnlyCents: 0,
    createdBy: admin.user.id,
    description: "Full Service",
    dueDate: new Date(new Date(2012, 11, 22).getTime() + daysToMs(10)),
    id: uuid.v4(),
    quoteId: quote.id,
    revenueShareBasisPoints: 0,
    createdAt: new Date(2012, 11, 22),
  };
  await db.transaction((trx: Knex.Transaction) => createBid(trx, inputBid));

  const rejectionReasons = {
    id: uuid.v4(),
    createdAt: new Date(),
    createdBy: partner.user.id,
    bidId: inputBid.id,
    priceTooLow: true,
    deadlineTooShort: false,
    missingInformation: false,
    other: true,
    notes: "Material sourcing not possible",
  };
  const created = await create(rejectionReasons);
  const foundById = await findByBidId(rejectionReasons.bidId);
  t.deepEqual(rejectionReasons, created);
  t.deepEqual(rejectionReasons, foundById);
});
