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
    this.referralCode = row.referral_code;
    this.createdAt = new Date(row.created_at);
  }

  toJSON() {
    return pick(this,
      'id',
      'name',
      'email',
      'session',
      'zip',
      'createdAt',
      'addresses',
      'referralCode'
    );
  }

  setAddresses(addresses) {
    this.addresses = addresses;
  }
}

module.exports = User;
