'use strict';

const pick = require('lodash/pick');

const AddressesDAO = require('./index');
const UsersDAO = require('../users');
const { test } = require('../../test-helpers/fresh');

const USER_DATA = {
  name: 'Q User',
  zip: '94117',
  email: 'user@example.com',
  password: 'hunter2'
};

const ADDRESS_DATA = Object.freeze({
  companyName: 'CALA',
  addressLine1: '1025 Oak St',
  addressLine2: 'Apt B',
  city: 'San Francisco',
  region: 'CA',
  postCode: '94117',
  country: 'USA'
});

test('AddressesDAO.create creates a new address', (t) => {
  let expectedAddress;

  return UsersDAO.create(USER_DATA).then((user) => {
    expectedAddress = Object.assign({}, ADDRESS_DATA, {
      userId: user.id
    });

    return AddressesDAO.create(expectedAddress);
  }).then((address) => {
    const actualAddress = pick(address, Object.keys(expectedAddress));
    t.deepEqual(actualAddress, expectedAddress);
  });
});
