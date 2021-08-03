import meow from "meow";

import { log, logServerError, table } from "../../services/logger";
import { format, green, yellow } from "../../services/colors";
import db from "../../services/db";
import DesignEvent from "../../components/design-events/types";

const cli = meow(
  "Moves all accepted bids from partner users to their partner team",
  {
    flags: {
      dryRun: {
        default: false,
        type: "boolean",
      },
    },
  }
);

interface BidAcceptanceDesignEvent {
  id: string;
  created_at: Date;
  type: string;
  partner_team_title: string;
  designer_team_title: string | null;
  design_title: string | null;
}

async function main(): Promise<string> {
  const isDryRun = cli.flags.dryRun;
  const trx = await db.transaction();

  // Update all bid acceptance events that are accepted by the user instead of the
  // team to add the target_team_id of the actor's partner team
  const { rows: updatedDesignEvents } = await trx.raw(`
WITH partner_users AS (
  SELECT id FROM users WHERE role = 'PARTNER'
)
UPDATE design_events
   SET target_team_id = (
     SELECT team_users.team_id
       FROM team_users
            JOIN teams ON teams.id = team_users.team_id
      WHERE (
               (design_events.type = 'ACCEPT_SERVICE_BID' AND team_users.user_id = design_events.actor_id)
            OR (design_events.type = 'BID_DESIGN' AND team_users.user_id = design_events.target_id)
            )
        AND team_users.role = 'OWNER'
        AND teams.type = 'PARTNER'
      ORDER BY team_users.created_at DESC
      LIMIT 1
   ),
   target_id = (CASE
                WHEN type = 'ACCEPT_SERVICE_BID' THEN target_id
                WHEN type = 'BID_DESIGN' THEN NULL
                ELSE target_id
                END)
 WHERE (design_events.type = 'ACCEPT_SERVICE_BID' OR design_events.type = 'BID_DESIGN')
   AND target_team_id IS NULL
   AND target_id IN (SELECT id FROM partner_users)
RETURNING *;
`);

  const { rows: updatedCollaborators } = await trx.raw(`
WITH partner_collaborators AS (
  SELECT collaborators.*
    FROM collaborators
         JOIN users ON users.id = collaborators.user_id
   WHERE collaborators.role = 'PARTNER'
     AND users.role = 'PARTNER'
)
UPDATE collaborators
   SET user_id = NULL,
       team_id = (
         SELECT team_users.team_id
           FROM team_users
                JOIN teams ON teams.id = team_users.team_id
          WHERE team_users.user_id = collaborators.user_id
            AND team_users.role = 'OWNER'
            AND teams.type = 'PARTNER'
          ORDER BY team_users.created_at DESC
          LIMIT 1
         )
  FROM partner_collaborators
 WHERE collaborators.user_id IS NOT NULL
   AND collaborators.team_id IS NULL
   AND collaborators.role = 'PARTNER'
   AND collaborators.id = partner_collaborators.id;
`);

  log(
    `Updated partner collaborators to teams (${updatedCollaborators.length})`
  );

  const eventsWithTeamMeta = await trx
    .from("design_events")
    .select([
      "design_events.id",
      "design_events.created_at",
      "design_events.type",
      "partner_teams.title AS partner_team_title",
      "designer_teams.title AS designer_team_title",
      "product_designs.title AS design_title",
    ])
    .join("product_designs", "product_designs.id", "design_events.design_id")
    .leftJoin(
      "collection_designs",
      "collection_designs.design_id",
      "product_designs.id"
    )
    .leftJoin(
      "collections",
      "collections.id",
      "collection_designs.collection_id"
    )
    .leftJoin(
      "teams AS designer_teams",
      "designer_teams.id",
      "collections.team_id"
    )
    .join(
      "teams AS partner_teams",
      "partner_teams.id",
      "design_events.target_team_id"
    )
    .whereIn(
      "design_events.id",
      updatedDesignEvents.map((event: DesignEvent) => event.id)
    )
    .orderBy("design_events.created_at", "desc");

  if (eventsWithTeamMeta.length !== updatedDesignEvents.length) {
    logServerError({
      updatedCount: updatedDesignEvents.length,
      lookupCount: eventsWithTeamMeta.length,
    });
    logServerError({ eventsWithTeamMeta, updatedDesignEvents });
    throw new Error("Unexpected number of design events");
  }

  log(`Bid events: (${eventsWithTeamMeta.length})`);
  table(
    eventsWithTeamMeta.map(
      ({
        id,
        created_at,
        type,
        partner_team_title,
        designer_team_title,
        design_title,
      }: BidAcceptanceDesignEvent) => ({
        ID: id,
        On: created_at,
        Type: type,
        Partner: partner_team_title,
        Designer: designer_team_title,
        Design: design_title,
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
