'use strict';

const uuid = require('node-uuid');
const rethrow = require('pg-rethrow');

const db = require('../../services/db');
const first = require('../../services/first').default;
const CollectionPhoto = require('../../domain-objects/collection-photo');

const instantiate = data => new CollectionPhoto(data);

function create(data) {
  return db('collectionphotos')
    .insert(
      {
        id: uuid.v4(),
        collection_id: data.collectionId,
        photo_url: data.photoUrl
      },
      '*'
    )
    .catch(rethrow)
    .then(first)
    .then(instantiate);
}

function findByCollectionId(collectionId) {
  return db('collectionphotos')
    .where({ collection_id: collectionId }, '*')
    .catch(rethrow)
    .then(photos => photos.map(instantiate));
}

module.exports = {
  create,
  findByCollectionId
};
