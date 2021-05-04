import Knex from "knex";
import rethrow = require("pg-rethrow");
import uuid from "node-uuid";

import { PartnerPayoutLogDb, PartnerPayoutLog } from "./types";
import adapter, { rawAdapter } from "./adapter";
import { computeUniqueShortId } from "../../services/short-id";
import first from "../../services/first";

const TABLE_NAME = "partner_payout_logs";
const ACCOUNTS_TABLE_NAME = "partner_payout_accounts";

export async function create(
  trx: Knex.Transaction,
  data: UninsertedWithoutShortId<PartnerPayoutLogDb>
): Promise<PartnerPayoutLogDb> {
  const shortId = await computeUniqueShortId();
  const rowData = rawAdapter.forInsertion({
    shortId,
    ...data,
    id: uuid.v4(),
    createdAt: new Date(),
  });

  const result = await trx(TABLE_NAME)
    .insert({ ...rowData, created_at: new Date() }, "*")
    .then(first)
    .catch(rethrow);

  if (!result) {
    throw new Error("Unable to create a new partner payout.");
  }

  return rawAdapter.fromDb(result);
}

export async function findByPayoutAccountId(
  ktx: Knex,
  accountId: string
): Promise<PartnerPayoutLogDb[]> {
  const result = await ktx(TABLE_NAME)
    .where({
      payout_account_id: accountId,
    })
    .orderBy("created_at", "desc")
    .catch(rethrow);

  return rawAdapter.fromDbArray(result);
}

export async function findByUserId(
  ktx: Knex,
  userId: string
): Promise<PartnerPayoutLog[]> {
  const result = await ktx(TABLE_NAME)
    .select(
      `${TABLE_NAME}.*`,
      "collections.id AS collection_id",
      "collections.title AS collection_title",
      "partner_payout_accounts.user_id as payout_account_user_id"
    )
    .leftJoin(
      ACCOUNTS_TABLE_NAME,
      `${TABLE_NAME}.payout_account_id`,
      `${ACCOUNTS_TABLE_NAME}.id`
    )
    .leftJoin("invoices", "invoices.id", `${TABLE_NAME}.invoice_id`)
    .leftJoin("pricing_bids", "pricing_bids.id", `${TABLE_NAME}.bid_id`)
    .leftJoin("design_events", "design_events.bid_id", "pricing_bids.id")
    .leftJoin(
      "collection_designs",
      "collection_designs.design_id",
      "design_events.design_id"
    )
    .joinRaw(
      `LEFT JOIN collections ON
      (
        collections.id = invoices.collection_id OR
        collections.id = collection_designs.collection_id
      )`
    )
    .where({
      "partner_payout_accounts.user_id": userId,
      "partner_payout_logs.bid_id": null,
    })
    .orWhere({
      "design_events.actor_id": userId,
      "design_events.type": "ACCEPT_SERVICE_BID",
    })
    .orderByRaw(`${TABLE_NAME}.created_at DESC`)
    .catch(rethrow);

  return adapter.fromDbArray(result);
}

export async function findByBidId(
  ktx: Knex,
  bidId: string
): Promise<PartnerPayoutLog[]> {
  const logs = await ktx(TABLE_NAME)
    .select(
      "partner_payout_logs.*",
      "partner_payout_accounts.user_id AS payout_account_user_id",
      "collections.id AS collection_id",
      "collections.title AS collection_title"
    )
    .join("pricing_bids", "pricing_bids.id", "partner_payout_logs.bid_id")
    .leftJoin(
      "partner_payout_accounts",
      "partner_payout_accounts.id",
      "partner_payout_logs.payout_account_id"
    )
    .join("design_events", "design_events.bid_id", "pricing_bids.id")
    .leftJoin(
      "collection_designs",
      "collection_designs.design_id",
      "design_events.design_id"
    )
    .leftJoin(
      "collections",
      "collections.id",
      "collection_designs.collection_id"
    )
    .where({
      "pricing_bids.id": bidId,
      "design_events.type": "ACCEPT_SERVICE_BID",
    })
    .orderBy("created_at", "DESC")
    .catch(rethrow);

  return adapter.fromDbArray(logs);
}
