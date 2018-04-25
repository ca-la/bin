'use strict';

const uuid = require('node-uuid');
const rethrow = require('pg-rethrow');
const compact = require('../../services/compact');

const db = require('../../services/db');
const filterError = require('../../services/filter-error');
const first = require('../../services/first');
const ProductDesignSelectedOption = require('../../domain-objects/product-design-selected-option');

const instantiate = data => new ProductDesignSelectedOption(data);
const maybeInstantiate = data => (data && new ProductDesignSelectedOption(data)) || null;

const { dataMapper } = ProductDesignSelectedOption;

function create(data) {
  const rowData = Object.assign({}, dataMapper.userDataToRowData(data), {
    id: uuid.v4()
  });

  return db('product_design_selected_options')
    .insert(rowData, '*')
    .catch(rethrow)
    .then(first)
    .then(instantiate);
}

function update(optionId, data) {
  const rowData = compact(dataMapper.userDataToRowData(data));

  return db('product_design_selected_options')
    .where({ id: optionId })
    .update(rowData, '*')
    .then(first)
    .then(instantiate);
}

function findByDesignId(designId) {
  return db('product_design_selected_options')
    .where({
      deleted_at: null,
      design_id: designId
    })
    .orderBy('created_at', 'desc')
    .catch(rethrow)
    .then(options => options.map(instantiate));
}

function findById(id) {
  return db('product_design_selected_options')
    .where({
      id,
      deleted_at: null
    })
    .catch(rethrow)
    .then(first)
    .then(maybeInstantiate)
    .catch(filterError(rethrow.ERRORS.InvalidTextRepresentation, () => null));
}

function deleteById(id) {
  return db('product_design_selected_options')
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

function deleteForSectionTrx(trx, sectionId) {
  return db('product_design_selected_options')
    .transacting(trx)
    .where({
      section_id: sectionId,
      deleted_at: null
    })
    .update({
      deleted_at: new Date()
    }, '*')
    .then(options => options.map(instantiate));
}

module.exports = {
  create,
  deleteById,
  deleteForSectionTrx,
  findByDesignId,
  findById,
  update
};
