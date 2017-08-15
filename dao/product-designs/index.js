'use strict';

const uuid = require('node-uuid');
const rethrow = require('pg-rethrow');

const db = require('../../services/db');
const compact = require('../../services/compact');
const first = require('../../services/first');
const ProductDesign = require('../../domain-objects/product-design');
const { requirePropertiesFormatted } = require('../../services/require-properties');

const instantiate = data => new ProductDesign(data);
const maybeInstantiate = data => (data && new ProductDesign(data)) || null;

function create(data) {
  const requiredMessages = {
    productType: 'Product Type',
    title: 'Title'
  };

  requirePropertiesFormatted(data, requiredMessages);

  return db('product_designs')
    .insert({
      description: data.description,
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

function deleteById(productDesignId) {
  return db('product_designs')
    .where({ id: productDesignId, deleted_at: null })
    .update({
      deleted_at: new Date()
    }, '*')
    .then(first)
    .then(instantiate);
}

function update(productDesignId, data) {
  return db('product_designs')
    .where({ id: productDesignId, deleted_at: null })
    .update(compact({
      title: data.title,
      product_options: data.productOptions
    }), '*')
    .then(first)
    .then(instantiate);
}

function findByUserId(userId) {
  return db('product_designs')
    .where({
      user_id: userId,
      deleted_at: null
    })
    .orderBy('created_at', 'desc')
    .catch(rethrow)
    .then(designs => designs.map(instantiate));
}

function findById(id) {
  return db('product_designs')
    .where({
      id,
      deleted_at: null
    })
    .catch(rethrow)
    .then(first)
    .then(maybeInstantiate)
    .catch(rethrow.ERRORS.InvalidTextRepresentation, () => null);
}

module.exports = {
  create,
  deleteById,
  update,
  findById,
  findByUserId
};
