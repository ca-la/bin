import * as Knex from 'knex';
import uuid = require('node-uuid');
import rethrow = require('pg-rethrow');

import db = require('../../services/db');
import filterError = require('../../services/filter-error');
import InvalidDataError = require('../../errors/invalid-data');
import first from '../../services/first';
import normalizeEmail = require('../../services/normalize-email');
import * as ProductDesignsDAO from '../product-designs';
import Collaborator,
{
  CollaboratorRow,
  CollaboratorWithUser,
  dataAdapter,
  isCollaboratorRow,
  partialDataAdapter,
  UPDATABLE_PROPERTIES
} from '../../domain-objects/collaborator';
import UsersDAO = require('../users');
import { validate, validateEvery } from '../../services/validate-from-db';
import { pick, uniqBy } from 'lodash';

const TABLE_NAME = 'collaborators';

async function attachUser(collaborator: Collaborator): Promise<CollaboratorWithUser> {
  if (collaborator.userId) {
    const user = await UsersDAO.findById(collaborator.userId);
    return { ...collaborator, user };
  }

  return collaborator;
}

function handleForeignKeyViolation(
  collectionId: string,
  designId: string,
  userId: string,
  err: typeof rethrow.ERRORS.ForeignKeyViolation
): never {
  if (err.constraint === 'collaborators_collection_id_fkey') {
    throw new InvalidDataError(`Invalid collection ID: ${collectionId}`);
  }
  if (err.constraint === 'product_design_collaborators_design_id_fkey') {
    throw new InvalidDataError(`Invalid design ID: ${designId}`);
  }
  if (err.constraint === 'product_design_collaborators_user_id_fkey') {
    throw new InvalidDataError(`Invalid user ID: ${userId}`);
  }

  throw err;
}

export async function create(
  data: Unsaved<Collaborator>
): Promise<CollaboratorWithUser> {
  const rowData = dataAdapter.forInsertion({
    id: uuid.v4(),
    ...data,
    deletedAt: null
  });

  const created = await db(TABLE_NAME)
    .insert(rowData, '*')
    .then((rows: CollaboratorRow[]) => first<CollaboratorRow>(rows))
    .catch(rethrow)
    .catch(filterError(
      rethrow.ERRORS.ForeignKeyViolation,
      handleForeignKeyViolation.bind(null, data.collectionId, data.designId, data.userId)
    ));

  if (!created) { throw new Error('Failed to create rows'); }

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
  data: Partial<Collaborator>
): Promise<Collaborator> {
  const rowData = pick(partialDataAdapter.forInsertion(data), UPDATABLE_PROPERTIES);

  if (Object.keys(rowData).length === 0) {
    throw new InvalidDataError(`
Attempting to update readonly properties of a Collaborator.
Updatable Properties: ${UPDATABLE_PROPERTIES.join(', ')}`.trim());
  }

  const updated = await db(TABLE_NAME)
    .where({ id: collaboratorId, deleted_at: null })
    .update(rowData, '*')
    .then((rows: CollaboratorRow[]) => first<CollaboratorRow>(rows))
    .catch(rethrow)
    .catch(filterError(
      rethrow.ERRORS.ForeignKeyViolation,
      handleForeignKeyViolation
        .bind(null, data.collectionId, data.designId, data.userId)
    ));

  if (!updated) { throw new Error('Failed to update rows'); }

  const collaborator = validate<CollaboratorRow, Collaborator>(
    TABLE_NAME,
    isCollaboratorRow,
    dataAdapter,
    updated
  );

  return attachUser(collaborator);
}

export async function findById(collaboratorId: string): Promise<Collaborator | null> {
  const collaboratorRow = await db(TABLE_NAME)
    .where({ id: collaboratorId, deleted_at: null })
    .then((rows: CollaboratorRow[]) => first<CollaboratorRow>(rows));

  if (!collaboratorRow) { return null; }

  const collaborator = validate<CollaboratorRow, Collaborator>(
    TABLE_NAME,
    isCollaboratorRow,
    dataAdapter,
    collaboratorRow
  );
  return attachUser(collaborator);
}

export async function findAllByIds(collaboratorIds: string[]): Promise<CollaboratorWithUser[]> {
  const collaboratorRows = await db(TABLE_NAME)
    .whereIn('id', collaboratorIds)
    .andWhere({ deleted_at: null })
    .orderBy('created_at', 'desc');

  const collaborators = validateEvery<CollaboratorRow, Collaborator>(
    TABLE_NAME,
    isCollaboratorRow,
    dataAdapter,
    collaboratorRows
  );

  return await Promise.all(collaborators.map(
    async (collaborator: Collaborator): Promise<CollaboratorWithUser> => attachUser(collaborator)
  ));
}

export async function findByDesign(designId: string): Promise<CollaboratorWithUser[]> {
  const design = await ProductDesignsDAO.findById(designId);
  if (!design) { return []; }
  const collaboratorRows = await db(TABLE_NAME)
    .where({
      deleted_at: null,
      design_id: designId
    })
    .modify((query: Knex.QueryBuilder) => {
      if (design.collectionIds.length > 0) {
        query.orWhere({
          collection_id: design.collectionIds[0],
          deleted_at: null
        });
      }
    })
    .orderBy('created_at', 'ASC');

  const collaborators = validateEvery<CollaboratorRow, CollaboratorWithUser>(
    TABLE_NAME,
    isCollaboratorRow,
    dataAdapter,
    collaboratorRows
  );

  const collaboratorsWithUsers = await Promise.all(collaborators.map(attachUser));
  return [
    ...uniqBy(collaboratorsWithUsers
      .filter((collaborator: CollaboratorWithUser) => collaborator.userId !== null), 'userId'),
    ...uniqBy(collaboratorsWithUsers
      .filter((collaborator: CollaboratorWithUser) => collaborator.userEmail !== null), 'userEmail')
  ];
}

export async function findByCollection(collectionId: string): Promise<Collaborator[]> {
  const collaboratorRows = await db(TABLE_NAME)
    .where({
      collection_id: collectionId,
      deleted_at: null
    });

  const collaborators =  validateEvery<CollaboratorRow, Collaborator>(
    TABLE_NAME,
    isCollaboratorRow,
    dataAdapter,
    collaboratorRows
  );
  return Promise.all(collaborators.map(attachUser));
}

export async function findByTask(taskId: string): Promise<CollaboratorWithUser[]> {
  const collaboratorRows = await db(TABLE_NAME)
    .select('collaborators.*')
    .from(TABLE_NAME)
    .join('collaborator_tasks', 'collaborators.id', 'collaborator_tasks.collaborator_id')
    .where({
      'collaborator_tasks.task_id': taskId,
      'deleted_at': null
    });

  const collaborators = validateEvery<CollaboratorRow, CollaboratorWithUser>(
    TABLE_NAME,
    isCollaboratorRow,
    dataAdapter,
    collaboratorRows
  );
  return Promise.all(collaborators.map(attachUser));
}

export async function findByUserId(userId: string): Promise<CollaboratorWithUser[]> {
  const collaboratorRows = await db(TABLE_NAME)
    .where({
      deleted_at: null,
      user_id: userId
    });

  const collaborators =  validateEvery<CollaboratorRow, Collaborator>(
    TABLE_NAME,
    isCollaboratorRow,
    dataAdapter,
    collaboratorRows
  );
  return Promise.all(collaborators.map(attachUser));
}

export async function findByDesignAndUser(
  designId: string, userId: string
): Promise<CollaboratorWithUser | null> {
  const collaboratorRow = await db(TABLE_NAME)
    .where({
      deleted_at: null,
      design_id: designId,
      user_id: userId
    })
    .then((rows: CollaboratorRow[]) => first<CollaboratorRow>(rows));

  if (!collaboratorRow) { return null; }

  const collaborator = validate<CollaboratorRow, Collaborator>(
    TABLE_NAME,
    isCollaboratorRow,
    dataAdapter,
    collaboratorRow
  );
  return attachUser(collaborator);
}

export async function findByCollectionAndUser(
  collectionId: string, userId: string
): Promise<CollaboratorWithUser[]> {
  const collaboratorRows = await db(TABLE_NAME)
    .where({
      collection_id: collectionId,
      deleted_at: null,
      user_id: userId
    });

  const collaborators =  validateEvery<CollaboratorRow, Collaborator>(
    TABLE_NAME,
    isCollaboratorRow,
    dataAdapter,
    collaboratorRows
  );
  return Promise.all(collaborators.map(attachUser));
}

export async function findUnclaimedByEmail(email: string): Promise<Collaborator[]> {
  const normalized = normalizeEmail(email);

  const collaboratorRows = await db(TABLE_NAME)
    .whereRaw('lower(collaborators.user_email) = lower(?)', [normalized]);

  return validateEvery<CollaboratorRow, Collaborator>(
    TABLE_NAME,
    isCollaboratorRow,
    dataAdapter,
    collaboratorRows
  );
}

export async function deleteById(id: string): Promise<CollaboratorWithUser> {
  const deleted = await db(TABLE_NAME)
    .where({
      deleted_at: null,
      id
    })
    .update({
      deleted_at: new Date()
    }, '*')
    .then((rows: CollaboratorRow[]) => first<CollaboratorRow>(rows));

  if (!deleted) { throw new Error('Failed to delete rows'); }

  return validate<CollaboratorRow, Collaborator>(
    TABLE_NAME,
    isCollaboratorRow,
    dataAdapter,
    deleted
  );
}

export async function deleteByDesignAndUser(
  designId: string, userId: string
): Promise<CollaboratorWithUser[]> {
  const deletedRows = await db(TABLE_NAME)
    .where({
      deleted_at: null,
      design_id: designId,
      user_id: userId
    })
    .update({
      deleted_at: new Date()
    }, '*');

  const deleted = validateEvery<CollaboratorRow, Collaborator>(
    TABLE_NAME,
    isCollaboratorRow,
    dataAdapter,
    deletedRows
  );

  return Promise.all(deleted.map(attachUser));
}
