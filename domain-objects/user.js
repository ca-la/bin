'use strict';

const pick = require('lodash/pick');

const formatDateString = require('../services/format-date-string');
const { requireProperties } = require('../services/require-properties');

const ROLES = {
  user: 'USER',
  admin: 'ADMIN',
  partner: 'PARTNER'
};

const ALLOWED_SESSION_ROLES = {
  [ROLES.admin]: [ROLES.partner, ROLES.user, ROLES.admin],
  [ROLES.user]: [ROLES.user],
  // Important: Partners cannot log in as a regular user!
  [ROLES.partner]: [ROLES.partner]
};

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

    this.lastAcceptedDesignerTermsAt = row.last_accepted_designer_terms_at &&
      new Date(row.last_accepted_designer_terms_at);
    this.lastAcceptedPartnerTermsAt = row.last_accepted_partner_terms_at &&
      new Date(row.last_accepted_partner_terms_at);
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
      'isSmsPreregistration',
      'lastAcceptedDesignerTermsAt',
      'lastAcceptedPartnerTermsAt',
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
User.ALLOWED_SESSION_ROLES = ALLOWED_SESSION_ROLES;

module.exports = User;
