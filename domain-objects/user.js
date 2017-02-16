'use strict';

const pick = require('lodash/pick');

const requireProperties = require('../services/require-properties');

const ROLES = {
  user: 'USER',
  admin: 'ADMIN'
};

class User {
  constructor(row) {
    requireProperties(row, 'id');

    this.id = row.id;
    this.name = row.name;
    this.email = row.email;
    this.zip = row.zip;
    this.passwordHash = row.password_hash;
    this.referralCode = row.referral_code;
    this.role = row.role;
    this.createdAt = new Date(row.created_at);
  }

  /**
   * Get a lighter-weight user representation that can be used in places where
   * another customer's user data is potentially part of a response.
   */
  toPublicJSON() {
    return pick(this,
      'id',
      'name',
      'referralCode'
    );
  }

  toJSON() {
    return pick(this,
      'id',
      'name',
      'email',
      'zip',
      'createdAt',
      'addresses',
      'referralCode',
      'role'
    );
  }

  setAddresses(addresses) {
    this.addresses = addresses;
  }
}

User.ROLES = ROLES;

module.exports = User;
