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

  // Update all previously changed collaborator roles to point back to the
  // team's owner
  const { rows: updatedCollaborators } = await trx.raw<
    pg.QueryResult<CollaboratorRow>
  >(`
UPDATE collaborators
   SET team_id = null,
       user_id = (
         SELECT team_users.user_id
           FROM collaborators AS current_collab
                  JOIN team_users ON team_users.team_id = current_collab.team_id
          WHERE team_users.role = 'OWNER'
          ORDER BY team_users.created_at DESC
          LIMIT 1
       )
 WHERE role = 'PARTNER'
   AND team_id IS NOT NULL
   AND user_id IS NULL
RETURNING *;
`);

  log(
    `Updated partner collaborators back to team owner (${updatedCollaborators.length})`
  );

  // Insert a new collaborator row for each team
  const toInsert: CollaboratorRow[] = [];
  for (const collaborator of updatedCollaborators) {
    const { id } = await trx
      .from("teams")
      .select("teams.id")
      .join("team_users", "team_users.team_id", "teams.id")
      .join("users", "users.id", "team_users.user_id")
      .where({ "team_users.role": "OWNER", "users.id": collaborator.user_id })
      .orderBy("team_users.created_at", "desc")
      .first();

    toInsert.push({
      ...collaborator,
      id: uuid.v4(),
      user_id: null,
      team_id: id,
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
