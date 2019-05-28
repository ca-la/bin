'use strict';

const uuid = require('node-uuid');
const rethrow = require('pg-rethrow');
const compact = require('../../services/compact');

const db = require('../../services/db');
const filterError = require('../../services/filter-error');
const first = require('../../services/first').default;
const ProductDesignOption = require('../../domain-objects/product-design-option');

const instantiate = data => new ProductDesignOption(data);
const maybeInstantiate = data =>
  (data && new ProductDesignOption(data)) || null;

const { dataMapper } = ProductDesignOption;

function create(data, trx) {
  const rowData = Object.assign({}, dataMapper.userDataToRowData(data), {
    id: data.id || uuid.v4()
  });

  return db('product_design_options')
    .insert(rowData, '*')
    .modify(query => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .catch(rethrow)
    .then(first)
    .then(instantiate);
}

function update(optionId, data) {
  const rowData = compact(dataMapper.userDataToRowData(data));

  return db('product_design_options')
    .where({ id: optionId })
    .update(rowData, '*')
    .then(first)
    .then(instantiate);
}

function findById(optionId) {
  return db('product_design_options')
    .where({ id: optionId })
    .then(first)
    .then(maybeInstantiate)
    .catch(rethrow)
    .catch(filterError(rethrow.ERRORS.InvalidTextRepresentation, () => null));
}

function findForUser(userId, queryOptions) {
  const defaultOptions = { limit: null, offset: null, search: null };
  const { limit, offset, search } = Object.assign(defaultOptions, queryOptions);
  if (
    (limit !== null && typeof limit !== 'number') ||
    (offset !== null && typeof offset !== 'number')
  ) {
    throw new Error('Limit and offset must be numbers if provided');
  }

  return db('product_design_options')
    .where({
      deleted_at: null
    })
    .where(builder => {
      builder
        .andWhere({
          user_id: userId
        })
        .orWhere({
          is_builtin_option: true
        });

      if (search) {
        builder.andWhere(db.raw('title ~* :search', { search }));
      }
    })
    .orderByRaw(
      'user_id is not null desc, preview_image_id is not null desc, created_at desc, id desc'
    )
    .modify(query => {
      if (limit !== null) {
        query.limit(limit);
      }
      if (offset !== null) {
        query.offset(offset);
      }
    })
    .catch(rethrow)
    .then(options => options.map(instantiate));
}

function deleteById(id) {
  return db('product_design_options')
    .where({
      id,
      deleted_at: null
    })
    .update(
      {
        deleted_at: new Date()
      },
      '*'
    )
    .then(first)
    .then(maybeInstantiate);
}

module.exports = {
  create,
  update,
  findForUser,
  findById,
  deleteById
};
