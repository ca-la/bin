'use strict';

const uuid = require('node-uuid');
const rethrow = require('pg-rethrow');

const Collection = require('../../domain-objects/collection');
const {
  dataAdapter: collectionSubmissionStatusAdapter
} = require('../../domain-objects/collection-submission-status');
const InvalidDataError = require('../../errors/invalid-data');
const ProductDesignsDAO = require('../product-designs');
const compact = require('../../services/compact');
const db = require('../../services/db');
const filterError = require('../../services/filter-error');
const first = require('../../services/first').default;
const { requireProperties } = require('../../services/require-properties');

const instantiate = data => new Collection(data);
const maybeInstantiate = data => (data && new Collection(data)) || null;

const { dataMapper } = Collection;

const TABLE_NAME = 'collections';

function create(data) {
  try {
    requireProperties(data, 'createdBy');
  } catch (e) {
    return Promise.reject(new InvalidDataError(e.message));
  }

  const rowData = {
    id: uuid.v4(),
    ...dataMapper.userDataToRowData(data)
  };

  return db(TABLE_NAME)
    .insert(rowData, '*')
    .catch(rethrow)
    .then(first)
    .then(instantiate);
}

function deleteById(collectionId) {
  return db(TABLE_NAME)
    .where({ id: collectionId, deleted_at: null })
    .update({
      deleted_at: new Date()
    }, '*')
    .then(first)
    .then(instantiate);
}

function update(collectionId, data) {
  const rowData = compact(dataMapper.userDataToRowData(data));

  if (Object.keys(rowData).length < 1) {
    throw new InvalidDataError('No data provided');
  }

  return db(TABLE_NAME)
    .where({ id: collectionId, deleted_at: null })
    .update(rowData, '*')
    .then(first)
    .then(instantiate)
    .catch(rethrow);
}

function findByUserId(userId, filters) {
  const query = Object.assign({
    created_by: userId,
    deleted_at: null
  }, filters);

  return db(TABLE_NAME)
    .where(query)
    .orderBy('created_at', 'desc')
    .catch(rethrow)
    .then(collections => collections.map(instantiate));
}

function findByCollaboratorUserId(userId) {
  return db(TABLE_NAME)
    .select('collections.*')
    .from(TABLE_NAME)
    .join('collaborators', 'collaborators.collection_id', 'collections.id')
    .where({ 'collaborators.user_id': userId, 'collections.deleted_at': null })
    .orderBy('collections.created_at', 'desc')
    .catch(rethrow)
    .then(collections => collections.map(instantiate));
}

function findAll({ limit, offset, search }) {
  if (typeof limit !== 'number' || typeof offset !== 'number') {
    return Promise.reject(new Error('Limit and offset must be provided to find all collections'));
  }

  return db(TABLE_NAME)
    .where({ deleted_at: null })
    .orderBy('created_at', 'desc')
    .modify((query) => {
      if (search) {
        query.andWhere(db.raw('title ~* ?', [search]));
      }
    })
    .limit(limit)
    .offset(offset)
    .then(designs => designs.map(instantiate));
}

function findById(id, filters, options = {}) {
  if (!id) { throw new Error('Missing collection ID'); }
  const query = Object.assign({ id }, filters);

  if (options.includeDeleted !== true) {
    query.deleted_at = null;
  }

  return db(TABLE_NAME)
    .where(query)
    .then(first)
    .then(maybeInstantiate)
    .catch(rethrow)
    .catch(filterError(rethrow.ERRORS.InvalidTextRepresentation, () => null));
}

function addDesign(collectionId, designId) {
  if (!collectionId || !designId) {
    return Promise.reject(new InvalidDataError('You must pass both a collection and design ID to add a design to a collection'));
  }

  return db('collection_designs')
    .insert({
      collection_id: collectionId,
      design_id: designId
    }, '*')
    .then(() => ProductDesignsDAO.findByCollectionId(collectionId))
    .catch(rethrow);
}

function moveDesign(collectionId, designId) {
  if (!collectionId || !designId) {
    return Promise.reject(new InvalidDataError('You must pass both a collection and design ID to add a design to a collection'));
  }

  return db('collection_designs')
    .where({ design_id: designId })
    .del()
    .then(() => addDesign(collectionId, designId))
    .catch(rethrow);
}

async function findByDesign(designId) {
  if (!designId) { throw new InvalidDataError('Missing design ID'); }

  const collectionDesigns = await db('collection_designs')
    .where({ design_id: designId });

  const collections = await Promise.all(
    collectionDesigns.map(collectionDesign => findById(collectionDesign.collection_id))
  );

  return collections;
}

function removeDesign(collectionId, designId) {
  if (!collectionId || !designId) {
    return Promise.reject(new InvalidDataError('You must pass both a collection and design ID to add a design to a collection'));
  }

  return db('collection_designs')
    .where({
      collection_id: collectionId,
      design_id: designId
    })
    .del()
    .then(() => ProductDesignsDAO.findByCollectionId(collectionId))
    .catch(rethrow);
}

function getStatusById(collectionId) {
  if (!collectionId) {
    return Promise.reject(new InvalidDataError('You must pass a collection ID to retrieve status'));
  }

  return db.raw(`
SELECT
    c.id AS collection_id,
    (count(de_submitted.id) = count(d.id)) AS is_submitted,
    (count(de_costed.id) = count(d.id)) AS is_costed,
    (count(de_quoted.id) = count(d.id)) AS is_quoted,
    (count(de_paired.id) = count(d.id)) AS is_paired
  FROM collections AS c

  LEFT JOIN collection_designs AS cd ON cd.collection_id = c.id
  LEFT JOIN product_designs AS d ON cd.design_id = d.id

  LEFT JOIN design_events AS de_submitted
    ON cd.design_id = de_submitted.design_id
   AND de_submitted.type = 'SUBMIT_DESIGN'

  LEFT JOIN design_events AS de_costed
    ON cd.design_id = de_costed.design_id
   AND de_costed.type = 'COMMIT_COST_INPUTS'

  LEFT JOIN design_events AS de_quoted
    ON cd.design_id = de_quoted.design_id
   AND de_quoted.type = 'COMMIT_QUOTE'

  LEFT JOIN design_events AS de_paired
    ON cd.design_id = de_paired.design_id
   AND de_paired.type = 'COMMIT_PARTNER_PAIRING'

 WHERE c.id = ? AND c.deleted_at IS NULL
 GROUP BY c.id;
`, [collectionId])
    .then(rawResult => rawResult.rows)
    .then(first)
    .then(status => collectionSubmissionStatusAdapter.parse(status));
}

module.exports = {
  create,
  deleteById,
  update,
  findAll,
  findByDesign,
  findById,
  findByUserId,
  findByCollaboratorUserId,
  getStatusById,
  addDesign,
  moveDesign,
  removeDesign
};
