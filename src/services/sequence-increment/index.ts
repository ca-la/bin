import db from "../db";
import rethrow = require("pg-rethrow");

/**
 * Selects the next increment from the database.
 */
export default async function sequenceIncrement(
  tableName: string
): Promise<number> {
  const increment = await db
    .raw("SELECT nextval(?);", tableName)
    .then((result: any): number => result.rows[0].nextval)
    .catch(rethrow);

  if (!increment) {
    throw new Error("Increment could not be found!");
  }

  return increment;
}
