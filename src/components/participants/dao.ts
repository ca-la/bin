import Knex from "knex";

import { MentionType } from "../comments/types";
import { Participant } from "./types";
import { dataAdapter } from "./adapter";

const bidTaskTypeSubquery = (trx: Knex.Transaction, designId: string) =>
  trx
    .select("bid_task_types.task_type_id")
    .from("bid_task_types")
    .join(
      "design_events",
      "design_events.bid_id",
      "bid_task_types.pricing_bid_id"
    )
    .where({
      "design_events.type": "ACCEPT_SERVICE_BID",
      "design_events.design_id": designId,
    })
    .andWhere((subquery: Knex.QueryBuilder) =>
      subquery
        .where("design_events.target_id", trx.raw("users.id"))
        .orWhere("design_events.target_team_id", trx.raw("team_users.team_id"))
    )
    .whereNotIn(
      "design_events.bid_id",
      trx
        .select("design_events.bid_id")
        .from("design_events")
        .whereIn("design_events.type", ["REMOVE_PARTNER"])
    )
    .orderBy("bid_task_types.task_type_id");

export async function findByDesign(
  trx: Knex.Transaction,
  designId: string
): Promise<Participant[]> {
  const throughCollectionTeam = await trx
    .from("team_users")
    .select([
      trx.raw("? AS type", [MentionType.TEAM_USER]),
      "team_users.id AS id",
      trx.raw(
        `
COALESCE(
  users.name,
  users.email,
  team_users.user_email,
  team_users.id::TEXT
) AS display_name`
      ),
      "users.role",
      "users.id AS user_id",
      trx.raw("to_json(array[]::text[]) AS bid_task_type_ids"),
    ])
    .join("collections", "team_users.team_id", "collections.team_id")
    .join(
      "collection_designs",
      "collections.id",
      "collection_designs.collection_id"
    )
    .leftJoin("users", "team_users.user_id", "users.id")
    .where({
      "collection_designs.design_id": designId,
      "team_users.deleted_at": null,
    })
    .orderBy([{ column: "users.created_at", order: "asc" }]);

  const throughCollaborators = await trx
    .from("collaborators")
    .select([
      trx.raw(
        `
CASE WHEN team_users.id IS NOT NULL THEN ?
ELSE ? END
  AS type`,
        [MentionType.TEAM_USER, MentionType.COLLABORATOR]
      ),
      trx.raw(`
CASE WHEN team_users.id IS NOT NULL THEN team_users.id
ELSE collaborators.id END
  AS id`),
      trx.raw(
        `
COALESCE(
  users.name,
  users.email,
  collaborators.user_email,
  team_users.user_email,
  collaborators.id::TEXT
) AS display_name`
      ),
      "users.role",
      "users.id AS user_id",
      trx.raw("to_json(array(?)) AS bid_task_type_ids", [
        bidTaskTypeSubquery(trx, designId),
      ]),
    ])
    .leftJoin("team_users", "team_users.team_id", "collaborators.team_id")
    .leftJoin(
      "users",
      "users.id",
      trx.raw(`COALESCE(team_users.user_id, collaborators.user_id)`)
    )
    .leftJoin(
      "collection_designs",
      "collection_designs.collection_id",
      "collaborators.collection_id"
    )
    .whereRaw(
      `
(collaborators.cancelled_at IS NULL OR collaborators.cancelled_at > now())
AND
collaborators.deleted_at IS NULL
AND
team_users.deleted_at IS NULL
`
    )
    .andWhere((query: Knex.QueryBuilder) =>
      query.where({ "collaborators.design_id": designId }).orWhere({
        "collaborators.collection_id": trx.raw(
          "collection_designs.collection_id"
        ),
        "collection_designs.design_id": designId,
      })
    )
    .orderBy([
      { column: "collaborators.created_at", order: "asc" },
      { column: "users.created_at", order: "asc" },
    ]);

  return dataAdapter.fromDbArray([
    ...throughCollaborators,
    ...throughCollectionTeam,
  ]);
}
