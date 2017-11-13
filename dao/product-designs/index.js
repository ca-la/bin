'use strict';

const uuid = require('node-uuid');
const rethrow = require('pg-rethrow');

const compact = require('../../services/compact');
const db = require('../../services/db');
const first = require('../../services/first');
const InvalidDataError = require('../../errors/invalid-data');
const ProductDesign = require('../../domain-objects/product-design');
const ProductDesignCollaboratorsDAO = require('../../dao/product-design-collaborators');

const instantiate = data => new ProductDesign(data);
const maybeInstantiate = data => (data && new ProductDesign(data)) || null;

const { dataMapper } = ProductDesign;

function create(data) {
  const rowData = Object.assign({}, dataMapper.userDataToRowData(data), {
    id: uuid.v4(),
    preview_image_urls: JSON.stringify(data.previewImageUrls)
  });

  return db('product_designs')
    .insert(rowData, '*')
    .catch(rethrow)
    .then(first)
    .then(instantiate);
}

function deleteById(productDesignId) {
  return db('product_designs')
    .where({ id: productDesignId, deleted_at: null })
    .update({
      deleted_at: new Date()
    }, '*')
    .then(first)
    .then(instantiate);
}

function update(productDesignId, data) {
  const rowData = Object.assign({}, dataMapper.userDataToRowData(data), {
    preview_image_urls: JSON.stringify(data.previewImageUrls)
  });

  const compacted = compact(rowData);

  if (Object.keys(compacted).length < 1) {
    throw new InvalidDataError('No data provided');
  }

  return db('product_designs')
    .where({ id: productDesignId, deleted_at: null })
    .update(compacted, '*')
    .then(first)
    .then(instantiate)
    .catch(rethrow)
    .catch(rethrow.ERRORS.ForeignKeyViolation, (err) => {
      if (err.constraint === 'product_designs_status_fkey') {
        throw new InvalidDataError('Invalid product design status');
      }
      throw err;
    });
}

function findByUserId(userId) {
  return db('product_designs')
    .where({
      user_id: userId,
      deleted_at: null
    })
    .orderBy('created_at', 'desc')
    .catch(rethrow)
    .then(designs => designs.map(instantiate));
}

function findById(id) {
  return db('product_designs')
    .where({
      id,
      deleted_at: null
    })
    .catch(rethrow)
    .then(first)
    .then(maybeInstantiate)
    .catch(rethrow.ERRORS.InvalidTextRepresentation, () => null);
}

/**
 * Find all designs that either the user owns, or is a collaborator with access
 * @param {String} userId
 */
async function findAccessibleToUser(userId) {
  const ownDesigns = await findByUserId(userId);

  const collaborations = await ProductDesignCollaboratorsDAO.findByUserId(userId);
  const invitedDesigns = await Promise.all(collaborations.map((collaboration) => {
    return findById(collaboration.designId);
  }));

  // Deleted designs become holes in the array right now - TODO maybe clean this
  // up via a reduce or something
  const availableInvitedDesigns = invitedDesigns.filter(Boolean);

  return [...ownDesigns, ...availableInvitedDesigns];
}

module.exports = {
  create,
  deleteById,
  findAccessibleToUser,
  update,
  findById,
  findByUserId
};
