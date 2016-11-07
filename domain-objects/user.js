'use strict';

const pick = require('lodash/pick');

const requireProperties = require('../services/require-properties');

class User {
  constructor(row) {
    requireProperties(row, 'id');

    this.id = row.id;
    this.name = row.name;
    this.email = row.email;
    this.zip = row.zip;
    this.passwordHash = row.password_hash;

    // row.created_at may be a Date if parsed by Knex already, or a String if
    // returned by a JSON query. To make things easier, support both.
    this.createdAt = new Date(row.created_at);
  }

  toJSON() {
    return pick(this,
      'id',
      'name',
      'email',
      'zip',
      'createdAt'
    );
  }
}

module.exports = User;
