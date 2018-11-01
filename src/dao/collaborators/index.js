'use strict';

const uuid = require('node-uuid');
const rethrow = require('pg-rethrow');
const compact = require('../../services/compact');

const db = require('../../services/db');
const filterError = require('../../services/filter-error');
const first = require('../../services/first').default;
const InvalidDataError = require('../../errors/invalid-data');
const normalizeEmail = require('../../services/normalize-email');
const Collaborator = require('../../domain-objects/collaborator');
const UsersDAO = require('../users');

const instantiate = data => new Collaborator(data);
const maybeInstantiate = data => (data && new Collaborator(data)) || null;

const { dataMapper } = Collaborator;

const TABLE_NAME = 'collaborators';

async function attachUser(collaborator) {
  if (collaborator.userId) {
    const user = await UsersDAO.findById(collaborator.userId);
    collaborator.setUser(user);
  }

  return collaborator;
}

function create(data) {
  const rowData = Object.assign({}, dataMapper.userDataToRowData(data), {
    id: uuid.v4()
  });

  return db(TABLE_NAME)
    .insert(rowData, '*')
    .then(first)
    .then(instantiate)
    .then(attachUser)
    .catch(rethrow)
    .catch(filterError(rethrow.ERRORS.UniqueViolation, () => {
      throw new InvalidDataError('User has already been invited');
    }));
}

function update(collaboratorId, data) {
  const rowData = compact(dataMapper.userDataToRowData(data));

  return db(TABLE_NAME)
    .where({ id: collaboratorId, deleted_at: null })
    .update(rowData, '*')
    .then(first)
    .then(maybeInstantiate)
    .then(attachUser);
}

function findById(collaboratorId) {
  return db(TABLE_NAME)
    .where({ id: collaboratorId, deleted_at: null })
    .then(first)
    .then(maybeInstantiate);
}

function findByDesign(designId) {
  return db(TABLE_NAME)
    .where({
      deleted_at: null,
      design_id: designId
    })
    .catch(rethrow)
    .then(collaborators => collaborators.map(instantiate))
    .then(collaborators => Promise.all(collaborators.map(attachUser)));
}

function findByCollection(collectionId) {
  return db(TABLE_NAME)
    .where({
      deleted_at: null,
      collection_id: collectionId
    })
    .catch(rethrow)
    .then(collaborators => collaborators.map(instantiate))
    .then(collaborators => Promise.all(collaborators.map(attachUser)));
}

function findByTask(taskId) {
  return db(TABLE_NAME)
    .select('collaborators.*')
    .from(TABLE_NAME)
    .join('collaborator_tasks', 'collaborators.id', 'collaborator_tasks.collaborator_id')
    .where({
      deleted_at: null,
      'collaborator_tasks.task_id': taskId
    })
    .catch(rethrow)
    .then((collaborators) => {
      return collaborators.map(instantiate);
    })
    .then(collaborators => Promise.all(collaborators.map(attachUser)));
}

function findByUserId(userId) {
  return db(TABLE_NAME)
    .where({
      deleted_at: null,
      user_id: userId
    })
    .then(collaborators => collaborators.map(instantiate))
    .catch(rethrow);
}

function findByDesignAndUser(designId, userId) {
  return db(TABLE_NAME)
    .where({
      deleted_at: null,
      user_id: userId,
      design_id: designId
    })
    .then(collaborators => collaborators.map(instantiate))
    .then(collaborators => Promise.all(collaborators.map(attachUser)))
    .catch(rethrow);
}

function findByCollectionAndUser(collectionId, userId) {
  return db(TABLE_NAME)
    .where({
      collection_id: collectionId,
      deleted_at: null,
      user_id: userId
    })
    .then(collaborators => collaborators.map(instantiate))
    .then(collaborators => Promise.all(collaborators.map(attachUser)))
    .catch(rethrow);
}

function findUnclaimedByEmail(email) {
  const normalized = normalizeEmail(email);

  return db(TABLE_NAME)
    .whereRaw('lower(collaborators.user_email) = lower(?)', [normalized])
    .then(collaborators => collaborators.map(instantiate))
    .catch(rethrow);
}

function deleteById(id) {
  return db(TABLE_NAME)
    .where({
      id,
      deleted_at: null
    })
    .update({
      deleted_at: new Date()
    }, '*')
    .then(first)
    .then(maybeInstantiate);
}

module.exports = {
  create,
  deleteById,
  findByCollection,
  findByCollectionAndUser,
  findByDesign,
  findByDesignAndUser,
  findByTask,
  findById,
  findByUserId,
  findUnclaimedByEmail,
  update
};
