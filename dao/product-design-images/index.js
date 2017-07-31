'use strict';

const uuid = require('node-uuid');
const rethrow = require('pg-rethrow');

const db = require('../../services/db');
const first = require('../../services/first');
const ProductDesignImage = require('../../domain-objects/product-design-image');

const instantiate = data => new ProductDesignImage(data);

function create(data) {
  return db('product_design_images')
    .insert({
      id: uuid.v4(),
      design_id: data.designId
    }, '*')
    .catch(rethrow)
    .then(first)
    .then(instantiate);
}

function findByDesignId(designId) {
  return db('product_design_images')
    .where({
      design_id: designId,
      deleted_at: null
    }, '*')
    .orderBy('created_at', 'asc')
    .catch(rethrow)
    .then(images => images.map(instantiate));
}

function findById(id) {
  return db('product_design_images')
    .where({ id }, '*')
    .catch(rethrow)
    .then(first)
    .then(instantiate);
}

function deleteById(id) {
  return db('product_design_images')
    .where({ id })
    .update({
      deleted_at: new Date()
    }, '*')
    .catch(rethrow)
    .then(first)
    .then(instantiate);
}

module.exports = {
  create,
  findByDesignId,
  findById,
  deleteById
};
