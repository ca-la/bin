import Knex from "knex";
import process from "process";

import { log, logServerError } from "../../services/logger";
import { format, green } from "../../services/colors";
import db from "../../services/db";
import uuid from "node-uuid";

/*
Adds EDIT collaborator for designs created before automatic collaborators creation was added
Usage
$ bin/run [environment] src/scripts/one-off/2021-01-21-add-missing-collaborators.ts
*/

interface DesignRecord {
  id: string;
  user_id: string;
  cnt: string;
}

async function getDesigns(trx: Knex.Transaction): Promise<DesignRecord[]> {
  const results = await trx.raw(`
    SELECT
      d.id, d.user_id, count(collaborators.id) AS cnt
    FROM
      product_designs AS d
    LEFT JOIN
      collaborators
    ON (
      collaborators.user_id = d.user_id
      AND collaborators.design_id = d.id
      AND collaborators.role = 'EDIT'
    )
    GROUP by d.id
    HAVING count(collaborators.id)=0;
  `);

  results.rows.forEach((item: DesignRecord) => {
    if (item.cnt !== "0") {
      throw new Error(
        `Found wrong line in query result: ${JSON.stringify(item)}`
      );
    }
  });

  return results.rows;
}

async function insertMissingCollaborator(
  trx: Knex.Transaction,
  design: DesignRecord
) {
  await trx.raw(
    `
    INSERT INTO collaborators
      (id, design_id, user_id, role)
    VALUES
      (?, ?, ?, 'EDIT');
  `,
    [uuid.v4(), design.id, design.user_id]
  );
}

async function main(): Promise<string> {
  const trx = await db.transaction();
  try {
    const designs = await getDesigns(trx);
    let index: number = 0;
    for (const design of designs) {
      await insertMissingCollaborator(trx, design);
      index = index + 1;
      // tslint:disable-next-line: no-console
      console.log(
        "Inserted collaborator for design #",
        design.id,
        index,
        "/",
        designs.length
      );
    }
  } catch (err) {
    await trx.rollback();
    throw err;
  }

  await trx.commit();
  return format(green, "Success!");
}

main()
  .catch((err: any) => {
    logServerError(err);
    process.exit(1);
  })
  .then((message: string) => {
    log(message);
    process.exit(0);
  });
