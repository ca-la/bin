'use strict';

const uuid = require('node-uuid');
const rethrow = require('pg-rethrow');
const compact = require('../../services/compact');

const db = require('../../services/db');
const first = require('../../services/first');
const ProductDesignOption = require('../../domain-objects/product-design-option');

const instantiate = data => new ProductDesignOption(data);
const maybeInstantiate = data => (data && new ProductDesignOption(data)) || null;

function userDataToRowData(data) {
  return {
    type: data.type,
    user_id: data.userId,
    unit_cost_cents: data.unitCostCents,
    preferred_cost_unit: data.preferredCostUnit,
    weight_gsm: data.weightGsm,
    preferred_weight_unit: data.preferredWeightUnit,
    title: data.title,
    sku: data.sku,
    preview_image_id: data.previewImageId,
    pattern_image_id: data.patternImageId,
    vendor_name: data.vendorName
  };
}

function create(data) {
  const rowData = Object.assign({}, userDataToRowData(data), {
    id: uuid.v4()
  });

  return db('product_design_section_annotations')
    .insert(rowData, '*')
    .catch(rethrow)
    .then(first)
    .then(instantiate);
}

function update(optionId, data) {
  const rowData = compact(userDataToRowData(data));

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
    .catch(rethrow.ERRORS.InvalidTextRepresentation, () => null);
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
    .orderBy('created_at', 'desc')
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
