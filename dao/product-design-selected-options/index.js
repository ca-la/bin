'use strict';

const uuid = require('node-uuid');
const rethrow = require('pg-rethrow');
const compact = require('../../services/compact');

const db = require('../../services/db');
const first = require('../../services/first');
const ProductDesignSelectedOption = require('../../domain-objects/product-design-selected-option');

const instantiate = data => new ProductDesignSelectedOption(data);
const maybeInstantiate = data => (data && new ProductDesignSelectedOption(data)) || null;

function userDataToRowData(data) {
  return {
    design_id: data.designId,
    panel_id: data.panelId,
    option_id: data.optionId,
    units_required_per_garment: data.unitsRequiredPerGarment
  };
}

function create(data) {
  const rowData = Object.assign({}, userDataToRowData(data), {
    id: uuid.v4()
  });

  return db('product_design_selected_options')
    .insert(rowData, '*')
    .catch(rethrow)
    .then(first)
    .then(instantiate);
}

function update(optionId, data) {
  const rowData = compact(userDataToRowData(data));

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
    .catch(rethrow.ERRORS.InvalidTextRepresentation, () => null);
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

module.exports = {
  create,
  deleteById,
  findByDesignId,
  findById,
  update
};
