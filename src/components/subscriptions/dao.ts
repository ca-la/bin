import uuid from "node-uuid";
import Knex from "knex";

import first from "../../services/first";
import {
  dataAdapter,
  isSubscriptionRow,
  partialDataAdapter,
  Subscription,
  SubscriptionRow,
} from "./domain-object";
import { validate, validateEvery } from "../../services/validate-from-db";

const TABLE_NAME = "subscriptions";

export async function create(
  data: Uninserted<Subscription>,
  trx: Knex.Transaction
): Promise<Subscription> {
  const rowData = dataAdapter.forInsertion({
    ...data,
    id: uuid.v4(),
  });

  const res = await trx(TABLE_NAME)
    .insert(rowData, "*")
    .then((rows: SubscriptionRow[]) => first(rows));

  return validate<SubscriptionRow, Subscription>(
    TABLE_NAME,
    isSubscriptionRow,
    dataAdapter,
    res
  );
}

export async function findForUser(
  userId: string,
  trx: Knex.Transaction
): Promise<Subscription[]> {
  const res = await trx(TABLE_NAME).select("*").where({ user_id: userId });

  return validateEvery<SubscriptionRow, Subscription>(
    TABLE_NAME,
    isSubscriptionRow,
    dataAdapter,
    res
  );
}

export async function findActive(
  userId: string,
  trx: Knex.Transaction
): Promise<Subscription[]> {
  const res = await trx
    .from("subscriptions as s")
    .joinRaw(
      "left join team_users as tu on s.team_id = tu.team_id and tu.deleted_at is null"
    )
    .where((builder: Knex.QueryBuilder) => {
      builder.where({ "s.user_id": userId }).orWhere({ "tu.user_id": userId });
    })
    .andWhereRaw("(cancelled_at is null or cancelled_at > now())")
    .select("s.*");

  return validateEvery<SubscriptionRow, Subscription>(
    TABLE_NAME,
    isSubscriptionRow,
    dataAdapter,
    res
  );
}

export async function update(
  id: string,
  data: Partial<Subscription>,
  trx: Knex.Transaction
): Promise<Subscription> {
  const rowData = partialDataAdapter.forInsertion(data);

  const res = await trx(TABLE_NAME)
    .where({ id })
    .update(rowData, "*")
    .then((rows: SubscriptionRow[]) => first(rows));

  return validate<SubscriptionRow, Subscription>(
    TABLE_NAME,
    isSubscriptionRow,
    dataAdapter,
    res
  );
}
