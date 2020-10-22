import Knex from "knex";
import uuid = require("node-uuid");
import rethrow = require("pg-rethrow");

import ProductDesignsDAO from "../product-designs/dao";
import db from "../../services/db";
import InvalidDataError = require("../../errors/invalid-data");
import first from "../../services/first";
import normalizeEmail = require("../../services/normalize-email");
import filterError = require("../../services/filter-error");
import {
  dataAdapter,
  dataWithUserAdapter,
  isCollaboratorRow,
  isCollaboratorWithUserRow,
  partialDataAdapter,
  UPDATABLE_PROPERTIES,
} from "./domain-objects/collaborator";
import {
  CollaboratorWithUserMetaByDesign,
  CollaboratorWithUserMetaByDesignRow,
  dataAdapterByDesign,
  isCollaboratorWithUserMetaByDesignRow,
} from "./domain-objects/collaborator-by-design";
import * as UsersDAO from "../../components/users/dao";
import { validate, validateEvery } from "../../services/validate-from-db";
import { pick, uniqBy } from "lodash";
import { ALIASES, getBuilder as getCollaboratorViewBuilder } from "./view";
import Collaborator, {
  CollaboratorWithUser,
  CollaboratorRow,
  CollaboratorWithUserRow,
} from "./types";
import {
  PARTNER_TEAM_BID_EDITORS,
  PARTNER_TEAM_BID_PREVIEWERS,
} from "../team-users/types";

const TABLE_NAME = "collaborators";

async function attachUser(
  collaborator: Collaborator
): Promise<CollaboratorWithUser> {
  if (collaborator.userId) {
    const user = await UsersDAO.findById(collaborator.userId);
    return { ...collaborator, user };
  }

  return { ...collaborator, user: null };
}

function handleForeignKeyViolation(
  collectionId: string | null | undefined,
  designId: string | null | undefined,
  userId: string | null | undefined,
  err: typeof rethrow.ERRORS.ForeignKeyViolation
): never {
  if (err.constraint === "collaborators_collection_id_fkey") {
    throw new InvalidDataError(`Invalid collection ID: ${collectionId}`);
  }
  if (err.constraint === "product_design_collaborators_design_id_fkey") {
    throw new InvalidDataError(`Invalid design ID: ${designId}`);
  }
  if (err.constraint === "product_design_collaborators_user_id_fkey") {
    throw new InvalidDataError(`Invalid user ID: ${userId}`);
  }

  throw err;
}

export async function create(
  data: Unsaved<Collaborator>,
  trx?: Knex.Transaction
): Promise<CollaboratorWithUser> {
  const rowData = dataAdapter.forInsertion({
    id: uuid.v4(),
    ...data,
    deletedAt: null,
  });

  const created = await db(TABLE_NAME)
    .insert(rowData, "*")
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .then((rows: CollaboratorRow[]) => first<CollaboratorRow>(rows))
    .catch(rethrow)
    .catch(
      filterError(
        rethrow.ERRORS.ForeignKeyViolation,
        handleForeignKeyViolation.bind(
          null,
          data.collectionId,
          data.designId,
          data.userId
        )
      )
    );

  if (!created) {
    throw new Error("Failed to create rows");
  }

  const collaborator = validate<CollaboratorRow, Collaborator>(
    TABLE_NAME,
    isCollaboratorRow,
    dataAdapter,
    created
  );
  return attachUser(collaborator);
}

export async function update(
  collaboratorId: string,
  data: Partial<Collaborator>,
  trx?: Knex.Transaction
): Promise<Collaborator> {
  const rowData = pick(
    partialDataAdapter.forInsertion(data),
    UPDATABLE_PROPERTIES
  );

  if (Object.keys(rowData).length === 0) {
    throw new InvalidDataError(
      `
Attempting to update readonly properties of a Collaborator.
Updatable Properties: ${UPDATABLE_PROPERTIES.join(", ")}`.trim()
    );
  }

  const updated = await db(TABLE_NAME)
    .where({ id: collaboratorId })
    .andWhereRaw("(cancelled_at IS null OR cancelled_at > now())")
    .update(rowData, "*")
    .modify((query: Knex.QueryBuilder): void => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .then((rows: CollaboratorRow[]) => first<CollaboratorRow>(rows))
    .catch(rethrow)
    .catch(
      filterError(
        rethrow.ERRORS.ForeignKeyViolation,
        handleForeignKeyViolation.bind(
          null,
          data.collectionId,
          data.designId,
          data.userId
        )
      )
    );

  if (!updated) {
    throw new Error("Failed to update rows");
  }

  const collaborator = validate<CollaboratorRow, Collaborator>(
    TABLE_NAME,
    isCollaboratorRow,
    dataAdapter,
    updated
  );

  return attachUser(collaborator);
}

export async function findById(
  collaboratorId: string,
  includeCancelled: boolean = false,
  trx?: Knex.Transaction
): Promise<CollaboratorWithUser | null> {
  const collaboratorRow = await getCollaboratorViewBuilder()
    .where({ [ALIASES.collaboratorId]: collaboratorId })
    .modify((query: Knex.QueryBuilder): void => {
      if (trx) {
        query.transacting(trx);
      }
      if (!includeCancelled) {
        query.andWhereRaw("(cancelled_at IS null OR cancelled_at > now())");
      }
    })

    .then((rows: CollaboratorWithUserRow[]) =>
      first<CollaboratorWithUserRow>(rows)
    );

  if (!collaboratorRow) {
    return null;
  }

  const collaborator = validate<CollaboratorWithUserRow, CollaboratorWithUser>(
    TABLE_NAME,
    isCollaboratorWithUserRow,
    dataWithUserAdapter,
    collaboratorRow
  );
  return collaborator;
}

export async function findAllByIds(
  trx: Knex.Transaction,
  collaboratorIds: string[]
): Promise<CollaboratorWithUser[]> {
  const collaboratorRows = await getCollaboratorViewBuilder(trx)
    .whereIn(ALIASES.collaboratorId, collaboratorIds)
    .andWhereRaw("(cancelled_at IS null OR cancelled_at > now())")
    .orderBy("created_at", "desc");

  return validateEvery<CollaboratorWithUserRow, CollaboratorWithUser>(
    TABLE_NAME,
    isCollaboratorWithUserRow,
    dataWithUserAdapter,
    collaboratorRows
  );
}

export async function findByDesign(
  designId: string,
  trx?: Knex.Transaction
): Promise<CollaboratorWithUser[]> {
  const design = await ProductDesignsDAO.findById(designId);
  if (!design) {
    return [];
  }
  const collaboratorRows = await getCollaboratorViewBuilder()
    .whereRaw(
      "(cancelled_at IS NULL OR cancelled_at > now()) AND deleted_at IS NULL"
    )
    .andWhere((query: Knex.QueryBuilder) => {
      query.where({ design_id: designId });
      if (design.collectionIds.length > 0) {
        query.orWhere({
          collection_id: design.collectionIds[0],
        });
      }
    })
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .orderBy("created_at", "ASC");

  const collaboratorsWithUsers = validateEvery<
    CollaboratorWithUserRow,
    CollaboratorWithUser
  >(
    TABLE_NAME,
    isCollaboratorWithUserRow,
    dataWithUserAdapter,
    collaboratorRows
  );

  return [
    ...uniqBy(
      collaboratorsWithUsers.filter(
        (collaborator: CollaboratorWithUser) => collaborator.userId !== null
      ),
      "userId"
    ),
    ...uniqBy(
      collaboratorsWithUsers.filter(
        (collaborator: CollaboratorWithUser) => collaborator.userEmail !== null
      ),
      "userEmail"
    ),
  ];
}

/**
 * Finds all collaborators (and associated users) for the given designs, grouped by design id.
 * Checks for collaborators included in the design's collection (if it exists).
 */
export async function findByDesigns(
  designIds: string[]
): Promise<CollaboratorWithUserMetaByDesign[]> {
  const result = await db.raw(
    `
SELECT d.id AS design_id, array_remove(array_agg(to_jsonb(c1)), null) AS collaborators
FROM product_designs AS d
LEFT JOIN collection_designs AS cd ON cd.design_id = d.id
LEFT JOIN (
	SELECT collaborators.*,
    CASE
      WHEN u.id IS NOT null THEN to_json(u.*)
      ELSE null
    END AS user
	FROM collaborators
	LEFT JOIN users AS u ON u.id = collaborators.user_id
  ORDER BY collaborators.created_at DESC
) AS c1 ON c1.design_id = d.id OR c1.collection_id = cd.collection_id
WHERE
	d.deleted_at IS null
  AND (c1.cancelled_at IS NULL OR c1.cancelled_at > now())
  AND d.id = ANY(?)
GROUP BY d.id
ORDER BY d.created_at DESC;
    `,
    [designIds]
  );

  return validateEvery<
    CollaboratorWithUserMetaByDesignRow,
    CollaboratorWithUserMetaByDesign
  >(
    TABLE_NAME,
    isCollaboratorWithUserMetaByDesignRow,
    dataAdapterByDesign,
    result.rows
  );
}

export async function findByCollection(
  collectionId: string
): Promise<Collaborator[]> {
  const collaboratorRows = await getCollaboratorViewBuilder()
    .where({ collection_id: collectionId })
    .andWhereRaw("(cancelled_at IS null OR cancelled_at > now())");

  const collaborators = validateEvery<
    CollaboratorWithUserRow,
    CollaboratorWithUser
  >(
    TABLE_NAME,
    isCollaboratorWithUserRow,
    dataWithUserAdapter,
    collaboratorRows
  );
  return collaborators;
}

export async function findByTask(
  taskId: string,
  trx?: Knex.Transaction
): Promise<CollaboratorWithUser[]> {
  const collaboratorRows = await getCollaboratorViewBuilder()
    .join(
      "collaborator_tasks",
      ALIASES.collaboratorId,
      "collaborator_tasks.collaborator_id"
    )
    .where({ "collaborator_tasks.task_id": taskId })
    .andWhereRaw("(cancelled_at IS null OR cancelled_at > now())")
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    });

  const collaborators = validateEvery<
    CollaboratorWithUserRow,
    CollaboratorWithUser
  >(
    TABLE_NAME,
    isCollaboratorWithUserRow,
    dataWithUserAdapter,
    collaboratorRows
  );
  return collaborators;
}

export async function findByUserId(
  userId: string
): Promise<CollaboratorWithUser[]> {
  const collaboratorRows = await getCollaboratorViewBuilder()
    .where({ user_id: userId })
    .andWhereRaw("(cancelled_at IS null OR cancelled_at > now())");

  const collaborators = validateEvery<
    CollaboratorWithUserRow,
    CollaboratorWithUser
  >(
    TABLE_NAME,
    isCollaboratorWithUserRow,
    dataWithUserAdapter,
    collaboratorRows
  );
  return collaborators;
}

const selectRole = db.raw(
  `
  CASE
    WHEN
      collaborators_forcollaboratorsviewraw.team_id IS NULL OR
      team_users.role = ANY(:allowedRoles)
    THEN
      collaborators_forcollaboratorsviewraw.role
    ELSE
      'VIEW'
  END as role
`,
  { allowedRoles: PARTNER_TEAM_BID_EDITORS }
);

export async function findByDesignAndUser(
  designId: string,
  userId: string,
  trx?: Knex.Transaction
): Promise<CollaboratorWithUser | null> {
  const collaboratorRow = await getCollaboratorViewBuilder()
    .select(selectRole)
    .leftJoin(
      "team_users",
      "team_users.team_id",
      "collaborators_forcollaboratorsviewraw.team_id"
    )
    .whereRaw(
      `design_id = :designId AND
      (
        collaborators_forcollaboratorsviewraw.user_id = :userId OR
        team_users.user_id = :userId
      ) AND
      (
        CASE
          WHEN
            collaborators_forcollaboratorsviewraw.team_id IS NOT NULL AND
            collaborators_forcollaboratorsviewraw.role = 'PREVIEW'
          THEN
            team_users.role = ANY(:allowedRoles)
          ELSE
            true
        END
      )`,
      { designId, userId, allowedRoles: PARTNER_TEAM_BID_PREVIEWERS }
    )
    .andWhereRaw("(cancelled_at IS null OR cancelled_at > now())")
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .then((rows: CollaboratorWithUserRow[]) =>
      first<CollaboratorWithUserRow>(rows)
    );

  if (!collaboratorRow) {
    return null;
  }

  const collaborator = validate<CollaboratorWithUserRow, CollaboratorWithUser>(
    TABLE_NAME,
    isCollaboratorWithUserRow,
    dataWithUserAdapter,
    collaboratorRow
  );
  return collaborator;
}

export async function findByDesignAndTeam(
  trx: Knex.Transaction,
  designId: string,
  teamId: string
): Promise<Collaborator | null> {
  const collaboratorRow = await trx(TABLE_NAME)
    .select("*")
    .where({ design_id: designId, team_id: teamId })
    .andWhereRaw("(cancelled_at IS null OR cancelled_at > now())")
    .then((rows: CollaboratorRow[]) => first<CollaboratorRow>(rows));

  if (!collaboratorRow) {
    return null;
  }

  return validate<CollaboratorRow, Collaborator>(
    TABLE_NAME,
    isCollaboratorRow,
    dataAdapter,
    collaboratorRow
  );
}

export async function findAllForUserThroughDesign(
  designId: string,
  userId: string,
  trx?: Knex.Transaction
): Promise<CollaboratorWithUser[]> {
  const collaboratorRows = await getCollaboratorViewBuilder()
    .select(selectRole)
    .joinRaw(
      `
        LEFT JOIN collection_designs AS cd ON cd.design_id = :designId
        LEFT JOIN collections AS c ON c.id = cd.collection_id AND c.deleted_at IS null
        LEFT JOIN product_designs AS d ON d.id = :designId AND d.deleted_at IS null
        LEFT JOIN team_users ON team_users.team_id = collaborators_forcollaboratorsviewraw.team_id
    `,
      { designId }
    )
    .whereRaw(
      `
        (
          collaborators_forcollaboratorsviewraw.user_id = :userId OR
          team_users.user_id = :userId
        )
        AND (
          CASE
            WHEN
              collaborators_forcollaboratorsviewraw.team_id IS NOT NULL AND
              collaborators_forcollaboratorsviewraw.role = 'PREVIEW'
            THEN
              team_users.role = ANY(:allowedRoles)
            ELSE
              true
          END
        )
        AND (
          collaborators_forcollaboratorsviewraw.collection_id = c.id
          OR collaborators_forcollaboratorsviewraw.design_id = :designId
        )
        AND (
          collaborators_forcollaboratorsviewraw.cancelled_at IS null
          OR collaborators_forcollaboratorsviewraw.cancelled_at > now()
        )
    `,
      {
        userId,
        designId,
        allowedRoles: PARTNER_TEAM_BID_PREVIEWERS,
      }
    )
    .orderByRaw(
      `
collaborators_forcollaboratorsviewraw.created_at DESC
    `
    )
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    });

  return validateEvery<CollaboratorWithUserRow, CollaboratorWithUser>(
    TABLE_NAME,
    isCollaboratorWithUserRow,
    dataWithUserAdapter,
    collaboratorRows
  );
}

export async function findByCollectionAndUser(
  collectionId: string,
  userId: string,
  trx: Knex.Transaction
): Promise<CollaboratorWithUser[]> {
  const collaboratorRows = await getCollaboratorViewBuilder()
    .where({ collection_id: collectionId, user_id: userId })
    .andWhereRaw("(cancelled_at IS null OR cancelled_at > now())")
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    });

  const collaborators = validateEvery<
    CollaboratorWithUserRow,
    CollaboratorWithUser
  >(
    TABLE_NAME,
    isCollaboratorWithUserRow,
    dataWithUserAdapter,
    collaboratorRows
  );
  return collaborators;
}

export async function findUnclaimedByEmail(
  email: string
): Promise<Collaborator[]> {
  const normalized = normalizeEmail(email);
  const collaboratorRows = await getCollaboratorViewBuilder()
    .whereRaw("lower(user_email) = lower(?)", [normalized])
    .andWhereRaw("(cancelled_at IS null OR cancelled_at > now())");

  return validateEvery<CollaboratorRow, Collaborator>(
    TABLE_NAME,
    isCollaboratorRow,
    dataAdapter,
    collaboratorRows
  );
}

export async function deleteById(id: string): Promise<Collaborator> {
  const deleted = await db(TABLE_NAME)
    .where({ id })
    .andWhereRaw("(cancelled_at IS null OR cancelled_at > now())")
    .update({ cancelled_at: new Date() }, "*")
    .then((rows: CollaboratorRow[]) => first<CollaboratorRow>(rows));

  if (!deleted) {
    throw new Error("Failed to delete rows");
  }

  return validate<CollaboratorRow, Collaborator>(
    TABLE_NAME,
    isCollaboratorRow,
    dataAdapter,
    deleted
  );
}

export async function deleteByDesignAndUser(
  designId: string,
  userId: string
): Promise<Collaborator[]> {
  const deletedRows = await db(TABLE_NAME)
    .where({ design_id: designId, user_id: userId })
    .andWhereRaw("(cancelled_at IS null OR cancelled_at > now())")
    .update({ cancelled_at: new Date() }, "*");

  const deleted = validateEvery<CollaboratorRow, Collaborator>(
    TABLE_NAME,
    isCollaboratorRow,
    dataAdapter,
    deletedRows
  );

  return deleted;
}

/**
 * Cancels the collaborator role specifically for a partner (one of PARTNER or PREVIEW).
 * @param trx Knex transaction object
 * @param designId The design uuid.
 * @param partnerId The partner uuid.
 */
export async function cancelForDesignAndPartner(
  trx: Knex.Transaction,
  designId: string,
  partnerId: string
): Promise<Collaborator[]> {
  const cancelledRows = await trx(TABLE_NAME)
    .where({ design_id: designId })
    .andWhereRaw(
      db.raw("(user_id = :partnerId OR team_id = :partnerId)", { partnerId })
    )
    .andWhereRaw("(role = 'PREVIEW' OR role = 'PARTNER')")
    .andWhereRaw("(cancelled_at IS null OR cancelled_at > now())")
    .update({ cancelled_at: new Date() }, "*");

  const cancelled = validateEvery<CollaboratorRow, Collaborator>(
    TABLE_NAME,
    isCollaboratorRow,
    dataAdapter,
    cancelledRows
  );

  return cancelled;
}

export async function findByDesignAndTaskType(
  designId: string,
  taskTypeId: string,
  trx: Knex.Transaction
): Promise<Collaborator[]> {
  const rows = await db(TABLE_NAME)
    .transacting(trx)
    .select("collaborators.*")
    .join("design_events", "design_events.actor_id", "collaborators.user_id")
    .join(
      "bid_task_types",
      "bid_task_types.pricing_bid_id",
      "design_events.bid_id"
    )
    .where({
      "collaborators.design_id": designId,
      "design_events.type": "ACCEPT_SERVICE_BID",
      "collaborators.deleted_at": null,
      "bid_task_types.task_type_id": taskTypeId,
    })
    .andWhereRaw("(cancelled_at IS NULL OR cancelled_at > now())");

  return validateEvery<CollaboratorRow, Collaborator>(
    TABLE_NAME,
    isCollaboratorRow,
    dataAdapter,
    rows
  );
}
