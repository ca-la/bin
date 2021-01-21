import Knex from "knex";
import uuid from "node-uuid";
import rethrow = require("pg-rethrow");

import filterError = require("../../services/filter-error");
import InvalidDataError from "../../errors/invalid-data";
import first from "../../services/first";
import { dataAdapter, isPlanRow, Plan, PlanRow } from "./domain-object";
import { validate, validateEvery } from "../../services/validate-from-db";

const TABLE_NAME = "plans";

export async function create(
  trx: Knex.Transaction,
  data: MaybeUnsaved<Plan>
): Promise<Plan> {
  const rowData = dataAdapter.forInsertion({
    id: uuid.v4(),
    ...data,
  });

  const result = await trx(TABLE_NAME)
    .insert(rowData, "*")
    .then((rows: PlanRow[]) => first(rows))
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

  return validate<PlanRow, Plan>(TABLE_NAME, isPlanRow, dataAdapter, result);
}

export async function findAll(trx: Knex.Transaction): Promise<Plan[]> {
  const result = await trx(TABLE_NAME)
    .select("*")
    .orderBy("ordering", "asc")
    .orderBy("created_at", "desc");

  return validateEvery<PlanRow, Plan>(
    TABLE_NAME,
    isPlanRow,
    dataAdapter,
    result
  );
}

export async function findPublic(trx: Knex.Transaction): Promise<Plan[]> {
  const result = await trx(TABLE_NAME)
    .select("*")
    .where({ is_public: true })
    .orderBy("ordering", "asc");

  return validateEvery<PlanRow, Plan>(
    TABLE_NAME,
    isPlanRow,
    dataAdapter,
    result
  );
}

export async function findById(
  trx: Knex.Transaction,
  id: string
): Promise<Plan | null> {
  const result = await trx(TABLE_NAME)
    .select("*")
    .where({ id })
    .then((rows: PlanRow[]) => first(rows));

  if (!result) {
    return null;
  }

  return validate<PlanRow, Plan>(TABLE_NAME, isPlanRow, dataAdapter, result);
}
