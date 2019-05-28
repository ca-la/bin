'use strict';

const pick = require('lodash/pick');

const AddressesDAO = require('./index');
const UsersDAO = require('../../components/users/dao');
const { test } = require('../../test-helpers/fresh');

const USER_DATA = {
  name: 'Q User',
  email: 'user@example.com',
  password: 'hunter2',
  referralCode: 'freebie'
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

test('AddressesDAO.create creates a new address', async t => {
  const user = await UsersDAO.create(USER_DATA);

  const expectedAddress = Object.assign({}, ADDRESS_DATA, {
    userId: user.id
  });

  const address = await AddressesDAO.create(expectedAddress);
  const actualAddress = pick(address, Object.keys(expectedAddress));

  t.deepEqual(actualAddress, expectedAddress);
});

test('AddressesDAO.deleteById deletes an address', async t => {
  const user = await UsersDAO.create(USER_DATA);

  const data = Object.assign({}, ADDRESS_DATA, { userId: user.id });

  const address = await AddressesDAO.create(data);
  const deleted = await AddressesDAO.deleteById(address.id);

  t.notEqual(deleted.deletedAt, null);
});
