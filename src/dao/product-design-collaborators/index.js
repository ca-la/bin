'use strict';

const uuid = require('node-uuid');
const rethrow = require('pg-rethrow');
const compact = require('../../services/compact');

const db = require('../../services/db');
const filterError = require('../../services/filter-error');
const first = require('../../services/first').default;
const InvalidDataError = require('../../errors/invalid-data');
const normalizeEmail = require('../../services/normalize-email');
const ProductDesignCollaborator = require('../../domain-objects/product-design-collaborator');
const UsersDAO = require('../users');

const instantiate = data => new ProductDesignCollaborator(data);
const maybeInstantiate = data => (data && new ProductDesignCollaborator(data)) || null;

const { dataMapper } = ProductDesignCollaborator;

const TABLE_NAME = 'product_design_collaborators';

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
      throw new InvalidDataError('User has already been invited to this design');
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

function findUnclaimedByEmail(email) {
  const normalized = normalizeEmail(email);

  return db(TABLE_NAME)
    .whereRaw('lower(product_design_collaborators.user_email) = lower(?)', [normalized])
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
  findByDesign,
  findByDesignAndUser,
  findById,
  findByUserId,
  findUnclaimedByEmail,
  update
};
