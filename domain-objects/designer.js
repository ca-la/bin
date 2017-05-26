'use strict';

const { requireProperties } = require('../services/require-properties');

class Designer {
  constructor(row) {
    requireProperties(row, 'id');

    this.id = row.id;
    this.name = row.name;
    this.bioHtml = row.bioHtml;
    this.twitterHandle = row.twitterHandle;
    this.instagramHandle = row.instagramHandle;
  }
}

module.exports = Designer;
