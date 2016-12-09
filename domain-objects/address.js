'use strict';

const requireProperties = require('../services/require-properties');

class Address {
  constructor(row) {
    requireProperties(row, 'id');

    this.companyName = row.company_name;
    this.addressLine1 = row.address_line_1;
    this.addressLine2 = row.address_line_2;
    this.city = row.city;
    this.region = row.region;
    this.postCode = row.post_code;
    this.country = row.country;
    this.userId = row.user_id;
    this.createdAt = new Date(row.created_at);
  }
}

module.exports = Address;
