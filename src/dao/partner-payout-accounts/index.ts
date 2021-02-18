import rethrow from "pg-rethrow";
import uuid from "node-uuid";
import Knex from "knex";

import db from "../../services/db";
import first from "../../services/first";
import PartnerPayoutAccount from "../../domain-objects/partner-payout-account";

const instantiate = (row: any) => new PartnerPayoutAccount(row);

const maybeInstantiate = (data: any): PartnerPayoutAccount | null =>
  (data && new PartnerPayoutAccount(data)) || null;

const { dataMapper } = PartnerPayoutAccount;

const TABLE_NAME = "partner_payout_accounts";

export async function findById(id: string, ktx: Knex = db) {
  return ktx(TABLE_NAME)
    .where({ id, deleted_at: null })
    .then(first)
    .then(maybeInstantiate);
}

export async function findByUserId(userId: string) {
  return db(TABLE_NAME)
    .where({
      deleted_at: null,
      user_id: userId,
    })
    .then((payoutAccounts: any) => payoutAccounts.map(instantiate))
    .catch(rethrow);
}

export async function findByTeamId(ktx: Knex, teamId: string) {
  return ktx(TABLE_NAME)
    .select("partner_payout_accounts.*")
    .join("team_users", "team_users.user_id", "partner_payout_accounts.user_id")
    .where({
      "partner_payout_accounts.deleted_at": null,
      "team_users.team_id": teamId,
      "team_users.deleted_at": null,
    })
    .then((payoutAccounts: any) => payoutAccounts.map(instantiate))
    .catch(rethrow);
}

export async function create(data: PartnerPayoutAccount) {
  const rowData = Object.assign({}, dataMapper.userDataToRowData(data), {
    id: uuid.v4(),
  });

  return db(TABLE_NAME)
    .insert(rowData, "*")
    .then(first)
    .then(instantiate)
    .catch(rethrow);
}
