'use strict';

const pick = require('lodash/pick');

const { requireProperties } = require('../services/require-properties');

const ROLES = {
  user: 'USER',
  admin: 'ADMIN'
};

/**
 * @returns {String} yyyy-mm-dd
 */
function formatDateString(date) {
  const paddedYear = `0000${date.getUTCFullYear()}`.slice(-4);
  const paddedMonth = `00${date.getUTCMonth() + 1}`.slice(-2);
  const paddedDay = `00${date.getUTCDate()}`.slice(-2);

  return [paddedYear, paddedMonth, paddedDay].join('-');
}

class User {
  constructor(row) {
    requireProperties(row, 'id');

    this.createdAt = new Date(row.created_at);
    this.email = row.email;
    this.id = row.id;
    this.name = row.name;
    this.passwordHash = row.password_hash;
    this.isSmsPreregistration = row.is_sms_preregistration;
    this.phone = row.phone;
    this.referralCode = row.referral_code;
    this.role = row.role;

    if (row.birthday instanceof Date) {
      this.birthday = formatDateString(row.birthday);
    } else {
      this.birthday = row.birthday;
    }
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
      'addresses',
      'birthday',
      'createdAt',
      'email',
      'id',
      'name',
      'phone',
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
