import Knex from "knex";
import process from "process";

import { log, logServerError } from "../services/logger";
import { format, green } from "../services/colors";
import db from "../services/db";

/*
Moves all non-team subscriptions into the personal team for each user.
*/

interface SubscriptionMeta {
  id: string;
  user_id: string;
}

async function getNonTeamSubscriptions(
  trx: Knex.Transaction
): Promise<SubscriptionMeta[]> {
  const result = await trx.raw(
    `
    select
      id, user_id
    from subscriptions
      where team_id is null
      and (cancelled_at is null or cancelled_at > now());
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
    from team_users
    join teams
      on team_users.team_id = teams.id
    where
      team_users.user_id = ?
      and team_users.role = 'OWNER'
      and team_users.deleted_at is null
      and teams.deleted_at is null
    order by teams.created_at asc;
  `,
    [userId]
  );

  if (results.rows.length === 0) {
    return null;
  }

  return results.rows[0].id;
}

async function updateSubscriptionTeam(
  trx: Knex.Transaction,
  subscriptionId: string,
  teamId: string
): Promise<void> {
  const results = await trx.raw(
    `
    update subscriptions
    set
      team_id = ?,
      user_id = null
    where id = ?
    returning *
  `,
    [teamId, subscriptionId]
  );

  if (results.rows.length !== 1) {
    // tslint:disable-next-line: no-console
    console.error(results);
    throw new Error("Unexpected subscription update response");
  }
}

async function main(...args: string[]): Promise<string> {
  const trx = await db.transaction();

  try {
    const subscriptions = await getNonTeamSubscriptions(trx);
    // tslint:disable-next-line: no-console
    console.log(`Found ${subscriptions.length} non-team subscriptions`);
    let i = 1;

    for (const subscription of subscriptions) {
      const teamId = await findPersonalTeamId(trx, subscription.user_id);

      if (!teamId) {
        // tslint:disable-next-line: no-console
        console.error(
          `⚠️ Could not find team for user ${subscription.user_id}`
        );
        continue;
      }

      process.stdout.write(
        `(${i}/${subscriptions.length}) Updating subscription ${subscription.id} with team ID ${teamId}... `
      );

      await updateSubscriptionTeam(trx, subscription.id, teamId);
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
