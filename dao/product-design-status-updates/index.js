'use strict';

const uuid = require('node-uuid');
const rethrow = require('pg-rethrow');

const db = require('../../services/db');
const first = require('../../services/first');
const ProductDesignStatusUpdate = require('../../domain-objects/product-design-status-update');

const { dataMapper } = ProductDesignStatusUpdate;

const instantiate = data => new ProductDesignStatusUpdate(data);

const TABLE_NAME = 'product_design_status_updates';

function create(data) {
  const rowData = Object.assign({}, dataMapper.userDataToRowData(data), {
    id: uuid.v4()
  });

  return db(TABLE_NAME)
    .insert(rowData, '*')
    .catch(rethrow)
    .then(first)
    .then(instantiate);
}

function findByDesign(designId) {
  return db(TABLE_NAME)
    .where({
      design_id: designId
    })
    .catch(rethrow)
    .then(updates => updates.map(instantiate));
}

module.exports = {
  create,
  findByDesign
};
