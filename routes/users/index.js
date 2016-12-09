'use strict';

const router = require('koa-router')({
  prefix: '/users'
});

const InvalidDataError = require('../../errors/invalid-data');
const requireAuth = require('../../middleware/require-auth');
const UsersDAO = require('../../dao/users');
const AddressesDAO = require('../../dao/addresses');

/**
 * POST /users
 */
function* createUser() {
  const {
    name,
    zip,
    email,
    password,
    address
  } = this.state.body;

  const user = yield UsersDAO.create({ name, zip, email, password })
    .catch(InvalidDataError, err => this.throw(400, err));

  // This is super naive and doesn't use transactions; if the address creation
  // fails, the user will still be created. TODO clean up.
  if (address) {
    const addressData = Object.assign({}, address, {
      userId: user.id
    });

    const addressInstance = yield AddressesDAO.create(addressData)
      .catch(InvalidDataError, err => this.throw(400, err));

    user.setAddresses([addressInstance]);
  }

  this.status = 201;
  this.body = user;
}

/**
 * PUT /users/:userId/password
 * @param {String} password
 */
function* updatePassword() {
  this.assert(this.params.userId === this.state.userId, 403, 'You can only update your own user');

  const { password } = this.state.body;
  this.assert(password, 400, 'A new password must be provided');

  yield UsersDAO.updatePassword(this.params.userId, password);

  this.status = 200;
  this.body = { ok: true };
}

router.post('/', createUser);
router.put('/:userId/password', requireAuth, updatePassword);

module.exports = router.routes();
