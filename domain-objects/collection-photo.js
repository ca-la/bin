'use strict';

const { requireProperties } = require('../services/require-properties');

class CollectionPhoto {
  constructor(row) {
    requireProperties(row, 'id');

    this.id = row.id;
    this.collectionId = row.collection_id;
    this.photoUrl = row.photo_url;
  }
}

module.exports = CollectionPhoto;
