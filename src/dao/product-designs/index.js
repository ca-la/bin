'use strict';

const uuid = require('node-uuid');
const rethrow = require('pg-rethrow');

const compact = require('../../services/compact');
const db = require('../../services/db');
const filterError = require('../../services/filter-error');
const first = require('../../services/first');
const InvalidDataError = require('../../errors/invalid-data');
const ProductDesign = require('../../domain-objects/product-design');

const instantiate = data => new ProductDesign(data);
const maybeInstantiate = data => (data && new ProductDesign(data)) || null;

const { dataMapper } = ProductDesign;

const TABLE_NAME = 'product_designs';

function create(data) {
  const rowData = Object.assign({}, dataMapper.userDataToRowData(data), {
    id: uuid.v4(),
    preview_image_urls: JSON.stringify(data.previewImageUrls)
  });

  return db(TABLE_NAME)
    .insert(rowData, '*')
    .catch(rethrow)
    .then(first)
    .then(instantiate);
}

function deleteById(productDesignId) {
  return db(TABLE_NAME)
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

  return db(TABLE_NAME)
    .where({ id: productDesignId, deleted_at: null })
    .update(compacted, '*')
    .then(first)
    .then(instantiate)
    .catch(rethrow)
    .catch(filterError(rethrow.ERRORS.ForeignKeyViolation, (err) => {
      if (err.constraint === 'product_designs_status_fkey') {
        throw new InvalidDataError('Invalid product design status');
      }
      throw err;
    }));
}

function findByUserId(userId, filters) {
  const query = Object.assign({}, {
    user_id: userId,
    deleted_at: null
  }, filters);

  return db(TABLE_NAME)
    .select('product_designs.*', 'collection_designs.collection_id')
    .where(query)
    .leftJoin(
      'collection_designs',
      'product_designs.id',
      'collection_designs.design_id'
    )
    .orderBy('created_at', 'desc')
    .catch(rethrow)
    .then(designs => designs.map(instantiate));
}

function findAll({ limit, offset, search }) {
  if (typeof limit !== 'number' || typeof offset !== 'number') {
    throw new Error('Limit and offset must be provided to find all users');
  }

  return db(TABLE_NAME)
    .select('product_designs.*', 'collection_designs.collection_id')
    .where({ deleted_at: null })
    .leftJoin(
      'collection_designs',
      'product_designs.id',
      'collection_designs.design_id'
    )
    .orderBy('created_at', 'desc')
    .modify((query) => {
      if (search) {
        // Lazy person's search - allow fuzzy matching for design title, or
        // exact matching for design owner ID / status
        query.andWhere(db.raw('(title ~* :search or user_id::text = :search or status::text = :search)', { search }));
      }
    })
    .limit(limit)
    .offset(offset)
    .then(designs => designs.map(instantiate));
}

function findById(id, filters, options = {}) {
  const query = Object.assign({}, {
    id
  }, filters);

  if (options.includeDeleted !== true) {
    query.deleted_at = null;
  }

  return db(TABLE_NAME)
    .select('product_designs.*', 'collection_designs.collection_id')
    .where(query)
    .leftJoin(
      'collection_designs',
      'product_designs.id',
      'collection_designs.design_id'
    )
    .then(first)
    .then(maybeInstantiate)
    .catch(rethrow)
    .catch(filterError(rethrow.ERRORS.InvalidTextRepresentation, () => null));
}

function findByCollectionId(collectionId) {
  return db(TABLE_NAME)
    .select('product_designs.*', 'collection_designs.collection_id')
    .whereNull('product_designs.deleted_at')
    .joinRaw(`
join collection_designs on
  (collection_designs.design_id = product_designs.id and
  collection_designs.collection_id = ?)`, [collectionId])
    .orderBy('collection_designs.created_at', 'desc')
    .catch(rethrow)
    .then(designs => designs.map(instantiate));
}

module.exports = {
  create,
  deleteById,
  update,
  findAll,
  findById,
  findByUserId,
  findByCollectionId
};
