'use strict';

const uuid = require('node-uuid');
const rethrow = require('pg-rethrow');
const compact = require('../../services/compact');

const db = require('../../services/db');
const filterError = require('../../services/filter-error');
const first = require('../../services/first');
const ProductDesignOption = require('../../domain-objects/product-design-option');

const instantiate = data => new ProductDesignOption(data);
const maybeInstantiate = data => (data && new ProductDesignOption(data)) || null;

const { dataMapper } = ProductDesignOption;

function create(data) {
  const rowData = Object.assign({}, dataMapper.userDataToRowData(data), {
    id: uuid.v4()
  });

  return db('product_design_options')
    .insert(rowData, '*')
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

function findForUser(userId) {
  return db('product_design_options')
    .where({
      deleted_at: null,
      user_id: userId
    })
    .orWhere({
      deleted_at: null,
      is_builtin_option: true
    })
    .orderByRaw('user_id is not null desc, preview_image_id is not null desc, created_at desc')
    .catch(rethrow)
    .then(options => options.map(instantiate));
}

function deleteById(id) {
  return db('product_design_options')
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
  update,
  findForUser,
  findById,
  deleteById
};
