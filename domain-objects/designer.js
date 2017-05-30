'use strict';

const { requireProperties } = require('../services/require-properties');

class Designer {
  constructor(row) {
    requireProperties(row, 'id');

    this.id = row.id;
    this.name = row.name;
    this.bioHtml = row.bio_html;
    this.twitterHandle = row.twitter_handle;
    this.instagramHandle = row.instagram_handle;
    this.position = row.position;
  }

  setPhotos(photos) {
    this.photos = photos;
  }
}

module.exports = Designer;
