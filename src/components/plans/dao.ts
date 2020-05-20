import uuid from "node-uuid";
import rethrow = require("pg-rethrow");

import db from "../../services/db";
import filterError = require("../../services/filter-error");
import InvalidDataError = require("../../errors/invalid-data");
import first from "../../services/first";
import { dataAdapter, isPlanRow, Plan, PlanRow } from "./domain-object";
import { validate, validateEvery } from "../../services/validate-from-db";

const TABLE_NAME = "plans";

export async function create(data: Uninserted<Plan>): Promise<Plan> {
  const rowData = dataAdapter.forInsertion({
    id: uuid.v4(),
    ...data,
  });

  const result = await db(TABLE_NAME)
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

export async function findAll(): Promise<Plan[]> {
  const result = await db(TABLE_NAME).select("*");

  return validateEvery<PlanRow, Plan>(
    TABLE_NAME,
    isPlanRow,
    dataAdapter,
    result
  );
}

export async function findPublic(): Promise<Plan[]> {
  const result = await db(TABLE_NAME)
    .where({ is_public: true }, "*")
    .orderBy("ordering", "asc");

  return validateEvery<PlanRow, Plan>(
    TABLE_NAME,
    isPlanRow,
    dataAdapter,
    result
  );
}

export async function findById(id: string): Promise<Plan | null> {
  const result = await db(TABLE_NAME)
    .where({ id })
    .then((rows: PlanRow[]) => first(rows));

  if (!result) {
    return null;
  }

  return validate<PlanRow, Plan>(TABLE_NAME, isPlanRow, dataAdapter, result);
}
