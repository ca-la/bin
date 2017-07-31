'use strict';

const uuid = require('node-uuid');
const rethrow = require('pg-rethrow');

const db = require('../../services/db');
const compact = require('../../services/compact');
const first = require('../../services/first');
const ProductDesign = require('../../domain-objects/product-design');

const instantiate = data => new ProductDesign(data);

function create(data) {
  return db('product_designs')
    .insert({
      product_type: data.productType,
      product_options: data.productOptions,
      title: data.title,
      user_id: data.userId,
      id: uuid.v4()
    }, '*')
    .catch(rethrow)
    .then(first)
    .then(instantiate);
}

function update(productDesignId, data) {
  return db('product_designs')
    .where({ id: productDesignId })
    .update(compact({
      title: data.title,
      product_options: data.productOptions
    }), '*')
    .then(first)
    .then(instantiate);
}

module.exports = {
  create,
  update
};
