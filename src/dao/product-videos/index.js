'use strict';

const uuid = require('node-uuid');
const rethrow = require('pg-rethrow');

const db = require('../../services/db');
const first = require('../../services/first').default;
const ProductVideo = require('../../domain-objects/product-video');

const instantiate = data => new ProductVideo(data);

function create(data) {
  return db('productvideos')
    .insert(
      {
        id: uuid.v4(),
        product_id: data.productId,
        video_url: data.videoUrl,
        poster_image_url: data.posterImageUrl
      },
      '*'
    )
    .catch(rethrow)
    .then(first)
    .then(instantiate);
}

function findByProductIds(productIds) {
  return db('productvideos')
    .whereIn('product_id', productIds)
    .returning('*')
    .catch(rethrow)
    .then(videos => videos.map(instantiate));
}

module.exports = {
  create,
  findByProductIds
};
