'use strict';

const uuid = require('node-uuid');
const rethrow = require('pg-rethrow');
const compact = require('../../services/compact');

const db = require('../../services/db');
const first = require('../../services/first');
const InvalidDataError = require('../../errors/invalid-data');
const ProductDesignCollaborator = require('../../domain-objects/product-design-collaborator');
const UsersDAO = require('../users');

const instantiate = data => new ProductDesignCollaborator(data);

const { dataMapper } = ProductDesignCollaborator;

function create(data) {
  const rowData = Object.assign({}, dataMapper.userDataToRowData(data), {
    id: uuid.v4()
  });

  return db('product_design_collaborators')
    .insert(rowData, '*')
    .then(first)
    .then(instantiate)
    .catch(rethrow)
    .catch(rethrow.ERRORS.UniqueViolation, () => {
      throw new InvalidDataError('User has already been invited to this design');
    });
}

function update(collaboratorId, data) {
  const rowData = compact(dataMapper.userDataToRowData(data));

  return db('product_design_collaborators')
    .where({ id: collaboratorId, deleted_at: null })
    .update(rowData, '*')
    .then(first)
    .then(instantiate);
}

function findById(collaboratorId) {
  return db('product_design_collaborators')
    .where({ id: collaboratorId, deleted_at: null })
    .then(first)
    .then(instantiate);
}

function findByDesign(designId) {
  return db('product_design_collaborators')
    .where({
      deleted_at: null,
      design_id: designId
    })
    .catch(rethrow)
    .then(collaborators => collaborators.map(instantiate))
    .then(collaborators =>
      Promise.all(collaborators.map((collaborator) => {
        if (collaborator.userId) {
          return UsersDAO.findById(collaborator.userId)
            .then((user) => {
              collaborator.setUser(user);
              return collaborator;
            });
        }

        return collaborator;
      }))
    );
}

function findByUserId(userId) {
  return db('product_design_collaborators')
    .where({
      deleted_at: null,
      user_id: userId
    })
    .catch(rethrow)
    .then(collaborators => collaborators.map(instantiate));
}

function findUnclaimedByEmail(email) {
  return db('product_design_collaborators')
    .whereRaw('lower(product_design_collaborators.user_email) = lower(?)', [email])
    .catch(rethrow)
    .then(collaborators => collaborators.map(instantiate));
}

function deleteById(id) {
  return db('product_design_collaborators')
    .where({
      id,
      deleted_at: null
    })
    .update({
      deleted_at: new Date()
    }, '*')
    .then(first)
    .then(instantiate);
}

module.exports = {
  create,
  deleteById,
  findByDesign,
  findById,
  findByUserId,
  findUnclaimedByEmail,
  update
};
