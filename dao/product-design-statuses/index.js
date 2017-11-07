'use strict';

const rethrow = require('pg-rethrow');

const db = require('../../services/db');
const first = require('../../services/first');
const ProductDesignStatus = require('../../domain-objects/product-design-status');

const instantiate = data => new ProductDesignStatus(data);

const TABLE_NAME = 'product_design_statuses';

function findById(id) {
  return db(TABLE_NAME)
    .where({ id })
    .then(first)
    .then(instantiate)
    .catch(rethrow);
}

function findAll() {
  return db(TABLE_NAME)
    .select('*')
    .then(statuses => statuses.map(instantiate))
    .catch(rethrow);
}

module.exports = {
  findById,
  findAll
};
