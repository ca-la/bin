import uuid from "node-uuid";
import Knex from "knex";
import { omit } from "lodash";

import first from "../../services/first";
import { dataAdapter, isSubscriptionRow, partialDataAdapter } from "./adapter";
import { Subscription, SubscriptionRow, SubscriptionWithPlan } from "./types";
import { dataAdapter as planDataAdapter } from "../plans/adapter";
import { validate, validateEvery } from "../../services/validate-from-db";
import db from "../../services/db";

const TABLE_NAME = "subscriptions";

export async function createAll(
  trx: Knex.Transaction,
  data: Uninserted<Subscription>[]
): Promise<Subscription[]> {
  const rowData = data.map((sub: Uninserted<Subscription>) =>
    dataAdapter.forInsertion({
      ...sub,
      id: uuid.v4(),
    })
  );

  const res = await trx(TABLE_NAME).insert(rowData, "*");

  return validateEvery<SubscriptionRow, Subscription>(
    TABLE_NAME,
    isSubscriptionRow,
    dataAdapter,
    res
  );
}

export async function create(
  data: Uninserted<Subscription>,
  trx: Knex.Transaction
): Promise<Subscription> {
  const all = await createAll(trx, [data]);

  if (all.length !== 1) {
    throw new Error("Could not create subscription");
  }

  return all[0];
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
  ktx: Knex = db
): Promise<Subscription[]> {
  const res = await ktx
    .from("subscriptions as s")
    .joinRaw(
      "left join team_users as tu on s.team_id = tu.team_id and tu.deleted_at is null"
    )
    .where((builder: Knex.QueryBuilder) => {
      builder.where({ "s.user_id": userId }).orWhere({ "tu.user_id": userId });
    })
    .andWhereRaw("(cancelled_at is null or cancelled_at > now())")
    .select("s.*")
    .orderBy("s.created_at", "asc");

  return validateEvery<SubscriptionRow, Subscription>(
    TABLE_NAME,
    isSubscriptionRow,
    dataAdapter,
    res
  );
}

export async function findForTeamWithPlans(
  ktx: Knex,
  teamId: string,
  { isActive }: { isActive?: boolean } = {}
): Promise<SubscriptionWithPlan[]> {
  const res = await ktx
    .from("subscriptions as s")
    .where({ team_id: teamId })
    .modify((builder: Knex.QueryBuilder) => {
      return isActive
        ? builder.andWhereRaw("(cancelled_at is null or cancelled_at > now())")
        : builder;
    })
    .innerJoin("plans", "s.plan_id", "plans.id")
    .leftJoin("plan_stripe_prices", "plan_stripe_prices.plan_id", "plans.id")
    .groupBy(["s.id", "plans.id"])
    .select("s.*")
    .select(ktx.raw(`row_to_json(plans) as plan`))
    .select(
      ktx.raw(`
      COALESCE(
        JSON_AGG(plan_stripe_prices)
                FILTER (WHERE plan_stripe_prices.plan_id IS NOT NULL),
        '[]'
      ) AS stripe_prices
    `)
    );

  const subscriptions = validateEvery<SubscriptionRow, Subscription>(
    TABLE_NAME,
    isSubscriptionRow,
    dataAdapter,
    res
  );
  return subscriptions.map((subscription: Subscription, index: number) => {
    const planJson = res[index].plan;
    const planDb = {
      ...planJson,
      created_at: new Date(res[index].plan.created_at),
      stripePrices: res[index].stripe_prices,
    };
    return omit(
      {
        ...subscription,
        plan: planDataAdapter.fromDb(planDb),
      },
      "stripePrices"
    );
  });
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

export async function findActiveByTeamId(
  trx: Knex.Transaction,
  teamId: string
): Promise<Subscription | null> {
  const row = await trx<SubscriptionRow>(TABLE_NAME)
    .where({ team_id: teamId })
    .andWhereRaw("(cancelled_at is null or cancelled_at > now())")
    .first();

  if (!row) {
    return null;
  }

  return validate<SubscriptionRow, Subscription>(
    TABLE_NAME,
    isSubscriptionRow,
    dataAdapter,
    row
  );
}
