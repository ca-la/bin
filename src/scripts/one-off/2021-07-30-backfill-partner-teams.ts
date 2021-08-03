import meow from "meow";

import { log, logServerError, table } from "../../services/logger";
import { format, green, yellow } from "../../services/colors";
import db from "../../services/db";

const cli = meow(
  "Update (one of) a partner's personal non-partner teams to be a partner team",
  {
    flags: {
      dryRun: {
        default: false,
        type: "boolean",
      },
    },
  }
);

interface UserAndTeam {
  user_id: string;
  user_email: string;
  team_id: string;
  team_title: string;
}

async function main(): Promise<string> {
  const isDryRun = cli.flags.dryRun;
  const trx = await db.transaction();

  // Find a designer team for each partner user
  const { rows: partnerOwnedDesignerTeams } = await trx.raw(`
SELECT
  users.id as user_id,
  users.email as user_email,
  teams.id as team_id,
  teams.title as team_title
  FROM users

-- Pick the oldest designer team
       JOIN teams ON teams.id = (
         SELECT t2.id
           FROM team_users AS tu2
                JOIN teams AS t2 ON t2.id = tu2.team_id AND t2.type = 'DESIGNER'
          WHERE tu2.role = 'OWNER'
            AND tu2.user_id = users.id
          ORDER BY t2.created_at
          LIMIT 1
         )
 WHERE users.role = 'PARTNER'

-- Exclude any users who already have partner teams:
   AND users.id NOT IN (
     SELECT u2.id
       FROM users AS u2
            JOIN team_users AS tu3 ON tu3.user_id = u2.id
            JOIN teams AS t3 ON t3.id = tu3.team_id
      WHERE t3.type = 'PARTNER' AND tu3.role = 'OWNER'
     )

 GROUP BY users.id, teams.id;
`);

  log(
    `Partner-owned teams that are Designer-type teams: (${partnerOwnedDesignerTeams.length})`
  );
  table(
    partnerOwnedDesignerTeams.map(
      ({ user_email, team_title }: UserAndTeam) => ({
        Email: user_email,
        "Team name": team_title,
      })
    )
  );

  const updated = await trx("teams")
    .update({ type: "PARTNER" })
    .whereIn(
      "id",
      partnerOwnedDesignerTeams.map(({ team_id }: UserAndTeam) => team_id)
    )
    .returning("*");

  if (updated.length !== partnerOwnedDesignerTeams.length) {
    logServerError({ partnerOwnedDesignerTeams, updated });
    throw new Error("Unexpected number of updates");
  }

  try {
    if (isDryRun) {
      await trx.rollback();
      return format(yellow, "Transaction rolled back.");
    }

    await trx.commit();
    return format(green, "Success!");
  } catch (err) {
    await trx.rollback();
    throw err;
  }
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
