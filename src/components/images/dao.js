'use strict';

const uuid = require('node-uuid');
const rethrow = require('pg-rethrow');

const compact = require('../../services/compact');
const db = require('../../services/db');
const first = require('../../services/first').default;
const ProductDesignImage = require('./domain-object');

const instantiate = data => new ProductDesignImage(data);
const maybeInstantiate = data => data && new ProductDesignImage(data);

const TABLE_NAME = 'images';

function create(data, trx) {
  return db(TABLE_NAME)
    .insert({
      id: data.id || uuid.v4(),
      user_id: data.userId,
      original_height_px: data.originalHeightPx,
      original_width_px: data.originalWidthPx,
      mime_type: data.mimeType,
      title: data.title,
      description: data.description,
      upload_completed_at: data.uploadCompletedAt || null
    }, '*')
    .modify((query) => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .catch(rethrow)
    .then(first)
    .then(instantiate);
}

function findByUserId(userId) {
  return db(TABLE_NAME)
    .where({
      user_id: userId,
      deleted_at: null
    }, '*')
    .orderBy('created_at', 'desc')
    .catch(rethrow)
    .then(images => images.map(instantiate));
}

function findById(id) {
  return db(TABLE_NAME)
    .where({ deleted_at: null, id }, '*')
    .catch(rethrow)
    .then(first)
    .then(maybeInstantiate);
}

function update(id, data) {
  return db(TABLE_NAME)
    .where({ id })
    .update(compact({
      description: data.description,
      mime_type: data.mimeType,
      original_height_px: data.originalHeightPx,
      original_width_px: data.originalWidthPx,
      title: data.title,
      upload_completed_at: data.uploadCompletedAt
    }), '*')
    .catch(rethrow)
    .then(first)
    .then(instantiate);
}

module.exports = {
  create,
  findById,
  findByUserId,
  update
};
