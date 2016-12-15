'use strict';

const Promise = require('bluebird');

const SessionsDAO = require('../dao/sessions');
const UsersDAO = require('../dao/users');
const AddressesDAO = require('../dao/addresses');

const USER_DATA = Object.freeze({
  name: 'Q User',
  email: 'user@example.com',
  zip: '94117',
  password: 'hunter2',
  referralCode: 'freebie'
});

const ADDRESS_DATA = Object.freeze({
  companyName: 'CALA',
  addressLine1: '1025 Oak St',
  addressLine2: 'Apt B',
  city: 'San Francisco',
  region: 'CA',
  postCode: '94117',
  country: 'USA'
});

/**
 * Create a user, and optionally some associated resources
 * @param {Boolean} withSession whether to create a session
 * @param {Boolean} withAddress whether to create an address
 * @resolves with an object in the format:
 * {
 *   user: {...}
 *   session: {...}
 *   address: {...}
 * }
 */
function createUser(withSession = true, withAddress = false) {
  let user;
  return UsersDAO.create(USER_DATA)
    .then((_user) => {
      user = _user;

      const addressData = Object.assign({}, ADDRESS_DATA, {
        userId: user.id
      });

      return Promise.all([
        withSession && SessionsDAO.createForUser(user),
        withAddress && AddressesDAO.create(addressData)
      ]);
    })
    .then(([session, address]) => {
      return {
        user,
        session,
        address
      };
    });
}

module.exports = createUser;
