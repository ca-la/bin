'use strict';

const uuid = require('node-uuid');
const rethrow = require('pg-rethrow');

const compact = require('../../services/compact');
const db = require('../../services/db');
const first = require('../../services/first');
const ProductDesignEvent = require('../../domain-objects/product-design-event');

const { dataMapper } = ProductDesignEvent;

const instantiate = data => new ProductDesignEvent(data);

const TABLE_NAME = 'product_design_events';

async function create(data) {
  const rowData = Object.assign(
    {},
    compact(dataMapper.userDataToRowData(data)),
    { id: uuid.v4() }
  );

  return db(TABLE_NAME)
    .insert(rowData, '*')
    .then(first)
    .then(instantiate)
    .catch(rethrow);
}

function findByDesignId(designId) {
  return db(TABLE_NAME)
    .where({
      design_id: designId
    })
    .orderBy('created_at', 'desc')
    .then(events => events.map(instantiate))
    .catch(rethrow);
}

module.exports = {
  create,
  findByDesignId
};
