import Knex from "knex";
import process from "process";

import { log, logServerError } from "../../services/logger";
import { format, green } from "../../services/colors";
import db from "../../services/db";

/*
Moves all non-team collections into the personal team for each user.
*/

interface CollectionMeta {
  id: string;
  created_by: string;
}

async function getNonTeamCollections(
  trx: Knex.Transaction
): Promise<CollectionMeta[]> {
  const result = await trx.raw(
    `
    select
      id, created_by
    from collections
      where team_id is null;
  `
  );

  return result.rows;
}

async function findPersonalTeamId(
  trx: Knex.Transaction,
  userId: string
): Promise<string | null> {
  const results = await trx.raw(
    `
    select
      teams.id
    from teams
    left join team_users
      on team_users.team_id = teams.id
    where
      team_users.user_id = ?
      and team_users.role = 'OWNER'
    order by teams.created_at asc;
  `,
    [userId]
  );

  if (results.rows.length === 0) {
    return null;
  }

  return results.rows[0].id;
}

async function updateCollectionTeam(
  trx: Knex.Transaction,
  collectionId: string,
  teamId: string
): Promise<void> {
  const results = await trx.raw(
    `
    update collections
    set team_id = ?
    where id = ?
    returning *
  `,
    [teamId, collectionId]
  );

  if (results.rows.length !== 1) {
    // tslint:disable-next-line: no-console
    console.error(results);
    throw new Error("Unexpected collection update response");
  }
}

async function main(...args: string[]): Promise<string> {
  const trx = await db.transaction();

  try {
    const collections = await getNonTeamCollections(trx);
    // tslint:disable-next-line: no-console
    console.log(`Found ${collections.length} non-team collections`);
    let i = 1;

    for (const collection of collections) {
      const teamId = await findPersonalTeamId(trx, collection.created_by);

      if (!teamId) {
        // tslint:disable-next-line: no-console
        console.error(`Could not find team for user ${collection.created_by}`);
        continue;
      }

      process.stdout.write(
        `(${i}/${collections.length}) Updating collection ${collection.id} with team ID ${teamId}... `
      );

      await updateCollectionTeam(trx, collection.id, teamId);
      // tslint:disable-next-line: no-console
      console.log(format(green, "OK"));
      i += 1;
    }
  } catch (err) {
    await trx.rollback();
    throw err;
  }

  if (args.includes("--dry-run")) {
    // tslint:disable-next-line: no-console
    console.log("Dry run; rolling back...");
    await trx.rollback();
  } else {
    // tslint:disable-next-line: no-console
    console.log("Committing...");
    await trx.commit();
  }

  return format(green, "Success!");
}

main(...process.argv.slice(1))
  .catch((err: any) => {
    logServerError(err);
    process.exit(1);
  })
  .then((message: string) => {
    log(message);
    process.exit(0);
  });
