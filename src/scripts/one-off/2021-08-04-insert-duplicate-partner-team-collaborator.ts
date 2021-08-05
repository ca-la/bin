import meow from "meow";
import uuid from "node-uuid";
import pg from "pg";

import { log, logServerError, table } from "../../services/logger";
import { format, green, yellow } from "../../services/colors";
import db from "../../services/db";
import { CollaboratorRow } from "../../components/collaborators/types";

const cli = meow(
  "Return old partner collaborator back to the owner and insert new team collaborator",
  {
    flags: {
      dryRun: {
        default: false,
        type: "boolean",
      },
    },
  }
);

async function main(): Promise<string> {
  const isDryRun = cli.flags.dryRun;
  const trx = await db.transaction();

  try {
    // Find all partner design collaborators
    const { rows: partnerCollaborators } = await trx.raw<
      pg.QueryResult<CollaboratorRow>
    >(`
SELECT *
  FROM collaborators
 WHERE role = 'PARTNER'
   AND cancelled_at IS NULL
   AND design_id IS NOT NULL
   AND team_id IS NULL
   AND user_id IS NOT NULL;
`);

    // Insert a new collaborator row for each team
    const toInsert: CollaboratorRow[] = [];
    for (const collaborator of partnerCollaborators) {
      const team = await trx
        .from("teams")
        .select<{ id: string }>("teams.id")
        .join("team_users", "team_users.team_id", "teams.id")
        .join("users", "users.id", "team_users.user_id")
        .where({
          "teams.type": "PARTNER",
          "team_users.role": "OWNER",
          "users.id": collaborator.user_id,
        })
        .orderBy("team_users.created_at", "asc")
        .first();

      if (!team) {
        log(`-- Missing partner team for collaborator ${collaborator.id}`);
        log({ collaborator });
        continue;
      }

      toInsert.push({
        ...collaborator,
        id: uuid.v4(),
        user_id: null,
        team_id: team.id,
        created_at: new Date(),
      });
    }

    const insertedCollaborators = await trx("collaborators")
      .insert(toInsert)
      .returning<CollaboratorRow[]>("*");

    log(`New "team" collaborators: (${insertedCollaborators.length})`);
    table(
      insertedCollaborators.map(
        ({ id, team_id, design_id }: CollaboratorRow) => ({
          ID: id,
          Team: team_id,
          Design: design_id,
        })
      )
    );

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
