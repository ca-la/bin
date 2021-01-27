import Knex from "knex";
import uuid from "node-uuid";
import rethrow = require("pg-rethrow");

import db from "../../services/db";
import filterError = require("../../services/filter-error");
import InvalidDataError from "../../errors/invalid-data";
import { buildDao } from "../../services/cala-component/cala-dao";
import { rawDataAdapter, dataAdapter } from "./adapter";
import { Plan, PlanDb } from "./types";

function withStripePriceIds(query: Knex.QueryBuilder) {
  return query
    .select(
      db.raw(
        "array_remove(array_agg(plan_stripe_prices.stripe_price_id), null) AS stripe_price_ids"
      )
    )
    .leftJoin("plan_stripe_prices", "plan_stripe_prices.plan_id", "plans.id")
    .groupBy("plans.id");
}

const rawDao = buildDao("plans", "plans", rawDataAdapter, {
  orderColumn: "ordering",
});

const dao = buildDao("plans", "plans", dataAdapter, {
  orderColumn: "ordering",
  queryModifier: withStripePriceIds,
});

export async function create(
  trx: Knex.Transaction,
  data: MaybeUnsaved<PlanDb>
): Promise<Plan> {
  const result = await rawDao
    .create(trx, {
      ...data,
      createdAt: new Date(),
      id: uuid.v4(),
    })
    .catch(rethrow)
    .catch(
      filterError(
        rethrow.ERRORS.UniqueViolation,
        (err: Error & { constraint: string }) => {
          if (err.constraint === "one_default_plan") {
            throw new InvalidDataError("Only one default plan can exist");
          }
          throw err;
        }
      )
    );

  const found = await dao.findById(trx, result.id);

  if (!found) {
    throw new Error("Could not find created Plan");
  }

  return found;
}

export async function findAll(trx: Knex.Transaction): Promise<Plan[]> {
  return dao.find(trx, {}, (query: Knex.QueryBuilder) =>
    query.orderBy("created_at", "asc")
  );
}

export async function findPublic(trx: Knex.Transaction): Promise<Plan[]> {
  return dao.find(trx, { isPublic: true });
}

export async function findById(
  trx: Knex.Transaction,
  id: string
): Promise<Plan | null> {
  return dao.findById(trx, id);
}

export async function findFreeAndDefaultForTeams(
  trx: Knex.Transaction
): Promise<Plan | null> {
  return dao.findOne(trx, {
    isDefault: true,
    baseCostPerBillingIntervalCents: 0,
    perSeatCostPerBillingIntervalCents: 0,
  });
}

export function findCollectionTeamPlans(
  trx: Knex.Transaction,
  collectionId: string
): Promise<Plan[]> {
  return dao.find(trx, {}, (query: Knex.QueryBuilder) =>
    query
      .join("subscriptions", "plans.id", "subscriptions.plan_id")
      .join("collections", "subscriptions.team_id", "collections.team_id")
      .whereRaw(
        `
        collections.id = ? and (
          subscriptions.cancelled_at is null or
          subscriptions.cancelled_at > now()
        )
      `,
        [collectionId]
      )
  );
}

export function findTeamPlans(
  trx: Knex.Transaction,
  teamId: string
): Promise<Plan[]> {
  return dao.find(trx, {}, (query: Knex.QueryBuilder) =>
    query.join("subscriptions", "plans.id", "subscriptions.plan_id").whereRaw(
      `
        subscriptions.team_id = ? and (
          subscriptions.cancelled_at is null or
          subscriptions.cancelled_at > now()
        )
      `,
      [teamId]
    )
  );
}
