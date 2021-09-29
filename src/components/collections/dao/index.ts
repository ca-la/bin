import Knex from "knex";
import rethrow from "pg-rethrow";
import { pick } from "lodash";

import { dataAdapter, INSERTABLE_PROPERTIES } from "../domain-object";
import {
  Collection,
  CollectionDb,
  CollectionDbRow,
  CollectionDesignMeta,
  CollectionDesignMetaDb,
} from "../types";
import { CollectionDesignRow } from "../../../domain-objects/collection-design";

import db from "../../../services/db";
import { validateEvery } from "../../../services/validate-from-db";
import first from "../../../services/first";
import limitOrOffset from "../../../services/limit-or-offset";
import { ExpirationNotification } from "../../notifications/models/costing-expiration";
import {
  dataAdapter as metaDataApapter,
  isMetaCollectionRow,
  MetaCollection,
  MetaCollectionRow,
} from "../meta-domain-object";
import {
  calculateCollectionPermissions,
  calculateTeamCollectionPermissions,
} from "../../../services/get-permissions";
import { Roles } from "../../collaborators/types";
import { TeamUserRole } from "../../team-users";
import {
  identity,
  QueryModifier,
} from "../../../services/cala-component/cala-dao";
import {
  generatePreviewLinksFromDesignImageAssets,
  ThumbnailAndPreviewLinks,
} from "../../../services/attach-asset-links";

export const TABLE_NAME = "collections";

export interface ListOptions {
  limit?: number;
  offset?: number;
}

export function addDesignMetaToCollection(
  query: Knex.QueryBuilder
): Knex.QueryBuilder {
  return query.select(
    db.raw(`
     to_jsonb(ARRAY(
      SELECT json_build_object(
        'id',
        "product_designs".id,
        'title',
        "product_designs".title,
        'created_at',
        "product_designs".created_at,
        'image_assets',
        array_to_json(
          ARRAY (
            SELECT
              jsonb_build_object(
                'id', assets.id, 'page', co.asset_page_number
              )
            FROM
              canvases AS c
              JOIN components AS co ON co.id = c.component_id
              AND co.deleted_at IS NULL
              JOIN assets ON assets.id = co.sketch_id
              AND assets.deleted_at IS NULL
              AND assets.upload_completed_at IS NOT NULL
            WHERE
              c.design_id = product_designs.id
              AND c.archived_at IS NULL
              AND c.deleted_at IS NULL
            GROUP BY
              assets.id,
              co.asset_page_number,
              c.ordering
            ORDER BY
              c.ordering
            LIMIT
              2
          )
        )
      )
      FROM product_designs
      LEFT JOIN collection_designs ON collection_designs.design_id = product_designs.id
      WHERE product_designs.deleted_at IS NULL AND collection_designs.collection_id = collections.id
      GROUP BY product_designs.id
      ORDER BY product_designs.created_at DESC
    )) AS designs
  `)
  );
}

export function convertCollectionDesignsDbMetaToDesignMeta(
  designs: CollectionDesignMetaDb[] = []
): CollectionDesignMeta[] {
  return designs.map(
    (design: CollectionDesignMetaDb): CollectionDesignMeta => {
      return {
        id: design.id,
        title: design.title,
        createdAt: design.createdAt,
        previewImageUrls: generatePreviewLinksFromDesignImageAssets(
          design.imageAssets
        ).map((imageLink: ThumbnailAndPreviewLinks) => imageLink.previewLink),
      };
    }
  );
}

export async function create(
  data: CollectionDb,
  trx?: Knex.Transaction
): Promise<CollectionDb> {
  const rowData = pick(dataAdapter.forInsertion(data), INSERTABLE_PROPERTIES);

  const created = await db(TABLE_NAME)
    .insert(rowData, "*")
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .then((rows: CollectionDbRow[]) => first<CollectionDbRow>(rows))
    .catch(rethrow);

  if (!created) {
    throw new Error("Failed to create a collection");
  }

  return dataAdapter.fromDb(created);
}

export async function deleteById(ktx: Knex, id: string): Promise<CollectionDb> {
  const deleted = await ktx
    .from(TABLE_NAME)
    .where({ deleted_at: null, id })
    .update({ deleted_at: new Date() }, "*")
    .then((rows: CollectionDbRow[]) => first<CollectionDbRow>(rows));

  if (!deleted) {
    throw new Error(`Failed to delete collection ${id}`);
  }

  return dataAdapter.fromDb(deleted);
}

export async function update(
  id: string,
  data: Partial<CollectionDb>
): Promise<CollectionDb> {
  const rowData = dataAdapter.toDbPartial(data);
  const updated = await db(TABLE_NAME)
    .where({ deleted_at: null, id })
    .update(rowData, "*")
    .then((rows: CollectionDbRow[]) => first<CollectionDbRow>(rows))
    .catch(rethrow);

  if (!updated) {
    throw new Error(`Failed to update collection ${id}`);
  }

  return dataAdapter.fromDb(updated);
}

type CollectionDbRowWithCollaboratorRoles = CollectionDbRow & {
  collaborator_roles: Roles[];
};

type CollectionDbRowWithCollaboratorAndTeamRoles = CollectionDbRowWithCollaboratorRoles & {
  team_roles: TeamUserRole[];
};

export async function findByUser(
  ktx: Knex,
  options: ListOptions & {
    userId: string;
    sessionRole: string;
    search?: string;
  }
): Promise<Collection[]> {
  const collectionRows: CollectionDbRowWithCollaboratorAndTeamRoles[] = await ktx
    .from(TABLE_NAME)
    .select("collections.*")
    .select(
      ktx.raw(
        "array_remove(array_agg(collaborators.role), null) as collaborator_roles"
      )
    )
    .select(
      ktx.raw("array_remove(array_agg(team_users.role), null) as team_roles")
    )
    .groupBy("collections.id")
    .leftJoin("collaborators", (collaboratorsJoin: Knex.JoinClause) => {
      collaboratorsJoin
        .on("collaborators.collection_id", "=", "collections.id")
        .andOn("collaborators.user_id", ktx.raw("?", [options.userId]));
    })
    .leftJoin("teams", "teams.id", "collections.team_id")
    .leftJoin("team_users", (teamUsersJoin: Knex.JoinClause) => {
      teamUsersJoin
        .andOn("team_users.team_id", "=", "teams.id")
        .andOn("team_users.user_id", ktx.raw("?", [options.userId]));
    })
    .leftJoin("users", "users.id", "team_users.user_id")
    .modify((query: Knex.QueryBuilder): void => {
      if (options.search) {
        query.where(db.raw("(collections.title ~* ?)", options.search));
      }
    })
    .where({
      "collections.deleted_at": null,
      "team_users.deleted_at": null,
    })
    .andWhereRaw(
      ktx.raw(
        "(collaborators.cancelled_at IS NULL OR collaborators.cancelled_at > now())"
      )
    )
    .andWhereRaw(
      `
(
  collaborators.user_id = :userId
 OR
  team_users.user_id = :userId
)`,
      { userId: options.userId }
    )
    .modify(addDesignMetaToCollection)
    .modify(limitOrOffset(options.limit, options.offset))
    .orderBy("collections.created_at", "desc");

  const collectionDbs = dataAdapter.fromDbArray(collectionRows);

  return collectionDbs.map((collection: CollectionDb, index: number) => ({
    ...collection,
    designs: convertCollectionDesignsDbMetaToDesignMeta(collection.designs),
    permissions: calculateCollectionPermissions({
      collection,
      sessionRole: options.sessionRole,
      sessionUserId: options.userId,
      collaboratorRoles: collectionRows[index].collaborator_roles,
      teamUserRoles: collectionRows[index].team_roles || [],
    }),
  }));
}

// Find a list of collections which a user was "directly" shared on - i.e. via
// the collection sharing mechanism, not via being part of a team that owns the
// collection. These collections may or may not belong to other teams.
export async function findDirectlySharedWithUser(
  ktx: Knex,
  options: ListOptions & {
    userId: string;
    sessionRole: string;
    search?: string;
  }
): Promise<Collection[]> {
  const collectionRows: CollectionDbRowWithCollaboratorRoles[] = await ktx
    .from(TABLE_NAME)
    .select("collections.*")
    .select(ktx.raw("array_agg(collaborators.role) as collaborator_roles"))
    .groupBy("collections.id")
    .leftJoin("collaborators", "collaborators.collection_id", "collections.id")
    .modify((query: Knex.QueryBuilder): void => {
      if (options.search) {
        query.where(db.raw("(collections.title ~* ?)", options.search));
      }
    })
    .where("collections.deleted_at", null)
    .andWhereRaw(
      `
  collaborators.user_id = :userId
  AND (collaborators.cancelled_at IS NULL OR collaborators.cancelled_at > now())
`,
      { userId: options.userId }
    )
    .andWhere((query: Knex.QueryBuilder) => {
      query
        .whereNotIn("collections.team_id", (subquery: Knex.QueryBuilder) => {
          subquery
            .select("teams.id")
            .from("teams")
            .innerJoin("team_users", "team_users.team_id", "teams.id")
            .where("team_users.user_id", options.userId)
            .andWhere({
              "team_users.deleted_at": null,
              "teams.deleted_at": null,
            });
        })
        .orWhere("collections.team_id", null);
    })
    .modify(addDesignMetaToCollection)
    .modify(limitOrOffset(options.limit, options.offset))
    .orderBy("collections.created_at", "desc")
    .catch(rethrow);

  const collectionDbs = dataAdapter.fromDbArray(collectionRows);

  return collectionDbs.map((collection: CollectionDb, index: number) => ({
    ...collection,
    designs: convertCollectionDesignsDbMetaToDesignMeta(collection.designs),
    permissions: calculateCollectionPermissions({
      collection,
      sessionRole: options.sessionRole,
      sessionUserId: options.userId,
      collaboratorRoles: collectionRows[index].collaborator_roles,
      // fine to not lean on team roles
      // because we exclude collections, those user has an access to as a team user
      teamUserRoles: [],
    }),
  }));
}

export async function findByTeam(
  ktx: Knex,
  teamId: string,
  options: ListOptions = {}
): Promise<CollectionDb[]> {
  const collections: CollectionDbRow[] = await ktx
    .from(TABLE_NAME)
    .select("collections.*")
    .join("teams", "teams.id", "collections.team_id")
    .where({
      "collections.deleted_at": null,
      "teams.id": teamId,
    })
    .modify(addDesignMetaToCollection)
    .modify(limitOrOffset(options.limit, options.offset))
    .orderBy("collections.created_at", "desc")
    .catch(rethrow);

  return dataAdapter.fromDbArray(collections);
}

export async function findByTeamWithPermissionsByRole(
  ktx: Knex,
  teamId: string,
  teamRole: TeamUserRole,
  options: ListOptions = {}
): Promise<Collection[]> {
  const collectionsDb = await findByTeam(ktx, teamId, options);
  const permissions = calculateTeamCollectionPermissions(teamRole);
  return collectionsDb.map((collection: CollectionDb) => ({
    ...collection,
    designs: convertCollectionDesignsDbMetaToDesignMeta(collection.designs),
    permissions,
  }));
}

export async function findById(
  id: string,
  ktx: Knex = db
): Promise<CollectionDb | null> {
  const collection = await ktx(TABLE_NAME)
    .select("*")
    .where({ id, deleted_at: null })
    .modify(addDesignMetaToCollection)
    .first()
    .catch(rethrow);

  if (!collection) {
    return null;
  }

  return dataAdapter.fromDb(collection);
}

export async function findByDesign(
  designId: string,
  ktx: Knex = db
): Promise<CollectionDb[]> {
  const collectionDesigns: CollectionDesignRow[] = await ktx(
    "collection_designs"
  ).where({ design_id: designId });

  const maybeCollections = await Promise.all(
    collectionDesigns.map(
      (collectionDesign: CollectionDesignRow): Promise<CollectionDb | null> =>
        findById(collectionDesign.collection_id, ktx)
    )
  );
  const collections = maybeCollections.filter(
    (maybeCollection: CollectionDb | null): boolean => {
      return maybeCollection !== null;
    }
  ) as CollectionDb[];

  return collections;
}

/**
 * Finds all submitted but unpaid for collections
 */
export async function findSubmittedButUnpaidCollections(): Promise<
  CollectionDb[]
> {
  const collections: CollectionDbRow[] = await db(TABLE_NAME)
    .select("collections.*")
    .distinct("collections.id")
    .from(TABLE_NAME)
    .joinRaw(
      `
JOIN collection_designs as cd
  ON cd.collection_id = collections.id
    `
    )
    .joinRaw(
      `
JOIN (
  SELECT *
  FROM design_events AS de1
  JOIN product_designs as d
    ON d.id = de1.design_id
  WHERE type='SUBMIT_DESIGN'
    AND d.deleted_at is null
    AND NOT EXISTS (
    SELECT * from design_events AS de2
    WHERE de1.design_id = de2.design_id
      AND de2.type = 'COMMIT_QUOTE')
) AS de
  ON de.design_id = cd.design_id
    `
    )
    .where({ "collections.deleted_at": null })
    .orderBy("collections.id");

  return dataAdapter.fromDbArray(collections);
}

/**
 * Finds all collections that are:
 * - have cost inputs that are going to expire within the supplied time bound
 * - do not have a notification sent of the given type
 * - not deleted
 */
export async function findAllUnnotifiedCollectionsWithExpiringCostInputs(options: {
  time: Date;
  boundingHours: number;
  notificationType: ExpirationNotification;
  trx: Knex.Transaction;
}): Promise<MetaCollection[]> {
  const { boundingHours, notificationType, time, trx } = options;

  const lowerBound = new Date(time);
  lowerBound.setHours(time.getHours() - boundingHours);
  const upperBound = new Date(time);
  upperBound.setHours(time.getHours() + boundingHours);

  const rows: MetaCollectionRow[] = await db(TABLE_NAME)
    .distinct("collections.id AS id")
    .select("collections.created_by AS created_by")
    .from("pricing_cost_inputs AS pci")
    .leftJoin(
      "collection_designs",
      "collection_designs.design_id",
      "pci.design_id"
    )
    .leftJoin(
      "collections",
      "collections.id",
      "collection_designs.collection_id"
    )
    .leftJoin("notifications", "notifications.collection_id", "collections.id")
    .where({
      "pci.deleted_at": null,
      "collections.deleted_at": null,
    })
    .whereBetween("pci.expires_at", [lowerBound, upperBound])
    .whereNotIn(
      "collections.id",
      trx
        .distinct("c2.id")
        .from("collections AS c2")
        .leftJoin("notifications", "notifications.collection_id", "c2.id")
        .where({ "notifications.type": notificationType })
    )
    .transacting(trx);

  return validateEvery<MetaCollectionRow, MetaCollection>(
    TABLE_NAME,
    isMetaCollectionRow,
    metaDataApapter,
    rows
  );
}

/**
 * Determines if the given user is the owner of any parent collection of the design.
 */
export async function hasOwnership(options: {
  designId: string;
  userId: string;
  ktx?: Knex;
}): Promise<boolean> {
  const { designId, ktx = db, userId } = options;

  const ownerRows: { created_by: string }[] = await ktx(TABLE_NAME)
    .select("collections.created_by AS created_by")
    .leftJoin(
      "collection_designs",
      "collection_designs.collection_id",
      "collections.id"
    )
    .leftJoin(
      "product_designs",
      "product_designs.id",
      "collection_designs.design_id"
    )
    .where({
      "product_designs.id": designId,
      "product_designs.deleted_at": null,
      "collections.deleted_at": null,
    });

  return ownerRows.some(
    (ownerRow: { created_by: string }): boolean =>
      ownerRow.created_by === userId
  );
}

export async function count(
  ktx: Knex,
  filter: Partial<CollectionDb> = {},
  modifier: QueryModifier = identity
): Promise<number> {
  const namespacedFilter = dataAdapter.toDbPartial(filter) || {};
  const result = await ktx(TABLE_NAME)
    .count("*")
    .where(namespacedFilter)
    .modify(modifier);

  return Number(result[0].count);
}
