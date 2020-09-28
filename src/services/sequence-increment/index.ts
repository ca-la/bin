import db from "../db";
import rethrow = require("pg-rethrow");
import { QueryResult } from "pg";

/**
 * Selects the next increment from the database.
 */
export default async function sequenceIncrement(
  tableName: string
): Promise<number> {
  const sequence = await db
    .raw("SELECT nextval(?);", tableName)
    .then((result: QueryResult) => result.rows[0])
    .catch(rethrow);

  if (!sequence) {
    throw new Error(`Sequence could not be found with name: ${tableName}`);
  }

  return Number(sequence.nextval);
}

export async function getCurrentValue(tableName: string): Promise<number> {
  const sequence = await db
    .raw("SELECT currval(?);", tableName)
    .then((result: QueryResult) => result.rows[0])
    .catch(rethrow);

  if (!sequence) {
    throw new Error(`Sequence could not be found with name: ${tableName}`);
  }

  return Number(sequence.currval);
}
