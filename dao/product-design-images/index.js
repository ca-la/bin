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
      user_id: data.userId,
      original_height_px: data.originalHeightPx,
      original_width_px: data.originalWidthPx,
      title: data.title,
      description: data.description
    }, '*')
    .catch(rethrow)
    .then(first)
    .then(instantiate);
}

function findByUserId(userId) {
  return db('product_design_images')
    .where({
      user_id: userId,
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
  findByUserId,
  findById,
  deleteById
};
