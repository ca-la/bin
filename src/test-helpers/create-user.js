'use strict';

const SessionsDAO = require('../dao/sessions');
const UsersDAO = require('../components/users/dao');
const User = require('../components/users/domain-object');
const AddressesDAO = require('../dao/addresses');

const USER_DATA = Object.freeze({
  name: 'Q User',
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
 * @param {Boolean} options.withSession whether to create a session
 * @param {Boolean} options.withAddress whether to create an address
 * @resolves with an object in the format:
 * {
 *   user: {...}
 *   session: {...}
 *   address: {...}
 * }
 */
function createUser({
  withSession = true,
  withAddress = false,
  role = User.ROLES.user
} = {}) {
  let user;

  const data = Object.assign({}, USER_DATA, {
    role,
    email: `${Math.random()}@example.com`
  });

  return UsersDAO.create(data)
    .then(_user => {
      user = _user;

      const addressData = Object.assign({}, ADDRESS_DATA, {
        userId: user.id
      });

      return Promise.all([
        withSession && SessionsDAO.createForUser(user, { role }),
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
