import Knex from "knex";
import rethrow from "pg-rethrow";
import { pick } from "lodash";

import {
  dataAdapter,
  INSERTABLE_PROPERTIES,
  isCollectionRow,
  partialDataAdapter,
  UPDATABLE_PROPERTIES,
} from "../domain-object";
import { Collection, CollectionDb, CollectionDbRow } from "../types";
import { CollectionDesignRow } from "../../../domain-objects/collection-design";

import db from "../../../services/db";
import { validate, validateEvery } from "../../../services/validate-from-db";
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
  ADMIN_PERMISSIONS,
  calculateTeamCollectionPermissions,
  getPermissionsFromDesign,
} from "../../../services/get-permissions";
import { Roles } from "../../collaborators/types";
import { TeamUserRole } from "../../team-users";
import {
  identity,
  QueryModifier,
} from "../../../services/cala-component/cala-dao";

export const TABLE_NAME = "collections";

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

  return validate<CollectionDbRow, CollectionDb>(
    TABLE_NAME,
    isCollectionRow,
    dataAdapter,
    created
  );
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

  return validate<CollectionDbRow, CollectionDb>(
    TABLE_NAME,
    isCollectionRow,
    dataAdapter,
    deleted
  );
}

export async function update(
  id: string,
  data: Partial<CollectionDb>
): Promise<CollectionDb> {
  const rowData = pick(
    partialDataAdapter.forInsertion(data),
    UPDATABLE_PROPERTIES
  );
  const updated = await db(TABLE_NAME)
    .where({ deleted_at: null, id })
    .update(rowData, "*")
    .then((rows: CollectionDbRow[]) => first<CollectionDbRow>(rows))
    .catch(rethrow);

  if (!updated) {
    throw new Error(`Failed to update collection ${id}`);
  }

  return validate<CollectionDbRow, CollectionDb>(
    TABLE_NAME,
    isCollectionRow,
    dataAdapter,
    updated
  );
}

type CollectionDbRowWithCollaboratorRoles = CollectionDbRow & {
  collaborator_roles: Roles[];
};

type CollectionDbRowWithCollaboratorAndTeamRoles = CollectionDbRowWithCollaboratorRoles & {
  team_roles: TeamUserRole[];
};

export async function findByUser(
  ktx: Knex,
  options: {
    userId: string;
    sessionRole: string;
    limit?: number;
    offset?: number;
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
    .leftJoin("collaborators", "collaborators.collection_id", "collections.id")
    .leftJoin("teams", "teams.id", "collections.team_id")
    .leftJoin("team_users", "team_users.team_id", "teams.id")
    .leftJoin("users", "users.id", "team_users.user_id")
    .modify((query: Knex.QueryBuilder): void => {
      if (options.search) {
        query.where(db.raw("(collections.title ~* ?)", options.search));
      }
    })
    .where({
      "collections.deleted_at": null,
    })
    .andWhereRaw(
      `
((
  collaborators.user_id = :userId
  AND (collaborators.cancelled_at IS NULL OR collaborators.cancelled_at > now())
) OR (
  team_users.user_id = :userId
  AND team_users.deleted_at IS NULL
))`,
      { userId: options.userId }
    )
    .modify(limitOrOffset(options.limit, options.offset))
    .orderBy("collections.created_at", "desc")
    .catch(rethrow);

  const collectionDbs: CollectionDb[] = validateEvery<
    CollectionDbRow,
    CollectionDb
  >(TABLE_NAME, isCollectionRow, dataAdapter, collectionRows);

  return collectionDbs.map((collection: CollectionDb, index: number) => ({
    ...collection,
    permissions:
      options.sessionRole === "ADMIN"
        ? ADMIN_PERMISSIONS
        : collection.teamId !== null
        ? calculateTeamCollectionPermissions(collectionRows[index].team_roles)
        : getPermissionsFromDesign({
            collaboratorRoles:
              collection.createdBy === options.userId
                ? [...collectionRows[index].collaborator_roles, "EDIT"]
                : collectionRows[index].collaborator_roles,
            isCheckedOut: true,
            sessionRole: options.sessionRole,
            sessionUserId: options.userId,
          }),
  }));
}

// Find a list of collections which a user was "directly" shared on - i.e. via
// the collection sharing mechanism, not via being part of a team that owns the
// collection. These collections may or may not belong to other teams.
export async function findDirectlySharedWithUser(
  ktx: Knex,
  options: {
    userId: string;
    sessionRole: string;
    limit?: number;
    offset?: number;
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
    .where({
      "collections.deleted_at": null,
      "collaborators.user_id": options.userId,
    })
    .andWhereRaw(
      `
  collaborators.cancelled_at IS NULL OR collaborators.cancelled_at > now()
`
    )
    .modify(limitOrOffset(options.limit, options.offset))
    .orderBy("collections.created_at", "desc")
    .catch(rethrow);

  const collectionDbs: CollectionDb[] = validateEvery<
    CollectionDbRow,
    CollectionDb
  >(TABLE_NAME, isCollectionRow, dataAdapter, collectionRows);

  return collectionDbs.map((collection: CollectionDb, index: number) => ({
    ...collection,
    permissions:
      options.sessionRole === "ADMIN"
        ? ADMIN_PERMISSIONS
        : getPermissionsFromDesign({
            collaboratorRoles:
              collection.createdBy === options.userId
                ? [...collectionRows[index].collaborator_roles, "EDIT"]
                : collectionRows[index].collaborator_roles,
            isCheckedOut: true,
            sessionRole: options.sessionRole,
            sessionUserId: options.userId,
          }),
  }));
}

export async function findByTeam(
  ktx: Knex,
  teamId: string
): Promise<CollectionDb[]> {
  const collections: CollectionDbRow[] = await ktx
    .from(TABLE_NAME)
    .select("collections.*")
    .join("teams", "teams.id", "collections.team_id")
    .where({
      "collections.deleted_at": null,
      "teams.id": teamId,
    })
    .orderBy("collections.created_at", "desc")
    .catch(rethrow);

  return validateEvery<CollectionDbRow, CollectionDb>(
    TABLE_NAME,
    isCollectionRow,
    dataAdapter,
    collections
  );
}

export async function findByTeamWithPermissionsByRole(
  ktx: Knex,
  teamId: string,
  teamRole: TeamUserRole
): Promise<Collection[]> {
  const collectionsDb = await findByTeam(ktx, teamId);
  const permissions = calculateTeamCollectionPermissions(teamRole);
  return collectionsDb.map((collection: CollectionDb) => ({
    ...collection,
    permissions,
  }));
}

export async function findById(
  id: string,
  trx?: Knex.Transaction
): Promise<CollectionDb | null> {
  const collection = await db(TABLE_NAME)
    .where({ id, deleted_at: null })
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .then((rows: CollectionDbRow[]) => first<CollectionDbRow>(rows))
    .catch(rethrow);

  if (!collection) {
    return null;
  }

  return validate<CollectionDbRow, CollectionDb>(
    TABLE_NAME,
    isCollectionRow,
    dataAdapter,
    collection
  );
}

export async function findByDesign(
  designId: string,
  trx?: Knex.Transaction
): Promise<CollectionDb[]> {
  const collectionDesigns: CollectionDesignRow[] = await db(
    "collection_designs"
  )
    .where({ design_id: designId })
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    });
  const maybeCollections = await Promise.all(
    collectionDesigns.map(
      (collectionDesign: CollectionDesignRow): Promise<CollectionDb | null> =>
        findById(collectionDesign.collection_id, trx)
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

  return validateEvery<CollectionDbRow, CollectionDb>(
    TABLE_NAME,
    isCollectionRow,
    dataAdapter,
    collections
  );
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
  const namespacedFilter = partialDataAdapter.toDb(filter) || {};
  const result = await ktx(TABLE_NAME)
    .count("*")
    .where(namespacedFilter)
    .modify(modifier);

  return Number(result[0].count);
}
