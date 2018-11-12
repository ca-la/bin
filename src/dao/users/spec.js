'use strict';

const uuid = require('node-uuid');

const InvalidDataError = require('../../errors/invalid-data');
const UsersDAO = require('./index');
const DesignEventsDAO = require('../design-events');
const { test } = require('../../test-helpers/fresh');
const createUser = require('../../test-helpers/create-user');
const createBid = require('../../test-helpers/factories/bid').default;
const { create: createDesign } = require('../../dao/product-designs');

const USER_DATA = Object.freeze({
  name: 'Q User',
  email: 'USER@example.com',
  password: 'hunter2',
  referralCode: 'freebie'
});

const USER_DATA_WITH_PHONE = Object.assign({}, USER_DATA, {
  email: null,
  phone: '415 580 9925'
});

test('UsersDAO.create fails when email or phone is missing', (t) => {
  return UsersDAO.create({ name: 'Q User', password: 'hunter2' })
    .then(() => { throw new Error("Shouldn't get here"); })
    .catch((err) => {
      t.ok(err instanceof InvalidDataError);
    });
});

test('UsersDAO.create fails when password is missing', (t) => {
  return UsersDAO.create({ name: 'Q User', email: 'fooz@example.com' })
    .then(() => { throw new Error("Shouldn't get here"); })
    .catch((err) => {
      t.ok(err instanceof InvalidDataError);
      t.equal(err.message, 'Missing required information');
    });
});

test('UsersDAO.create fails if email already exists', (t) => {
  return UsersDAO.create(USER_DATA)
    .then(() => UsersDAO.create(USER_DATA))
    .then(() => { throw new Error("Shouldn't get here"); })
    .catch((err) => {
      t.ok(err instanceof InvalidDataError);
      t.equal(err.message, 'Email is already taken');
    });
});

test('UsersDAO.create fails if phone already exists', (t) => {
  return UsersDAO.create(USER_DATA_WITH_PHONE)
    .then(() => UsersDAO.create(USER_DATA_WITH_PHONE))
    .then(() => { throw new Error("Shouldn't get here"); })
    .catch((err) => {
      t.ok(err instanceof InvalidDataError);
      t.equal(err.message, 'Phone number is already taken');
    });
});

test('UsersDAO.create fails if email is invalid', (t) => {
  return UsersDAO.create({
    name: 'Q User',
    email: 'user at example.com',
    password: 'hunter2'
  })
    .then(() => { throw new Error("Shouldn't get here"); })
    .catch((err) => {
      t.ok(err instanceof InvalidDataError);
      t.equal(err.message, 'Invalid email');
    });
});

test('UsersDAO.create fails if phone is invalid', (t) => {
  return UsersDAO.create({
    name: 'Q User',
    email: 'user@example.com',
    phone: '911',
    password: 'hunter2'
  })
    .then(() => { throw new Error("Shouldn't get here"); })
    .catch((err) => {
      t.ok(err instanceof InvalidDataError);
      t.equal(err.message, 'Invalid country calling code');
    });
});

test('UsersDAO.create returns a new user with email but no phone', (t) => {
  return UsersDAO.create(USER_DATA)
    .then((user) => {
      t.equal(user.name, 'Q User');
      t.equal(user.email, 'user@example.com');
      t.equal(user.id.length, 36);
      t.notEqual(user.passwordHash, 'hunter2');
      t.equal(user.phone, null);
      t.equal(user.isSmsPreregistration, false);
    });
});

test('UsersDAO.create returns a new user with phone but no email', (t) => {
  return UsersDAO.create(USER_DATA_WITH_PHONE)
    .then((user) => {
      t.equal(user.name, 'Q User');
      t.equal(user.id.length, 36);
      t.notEqual(user.passwordHash, 'hunter2');
      t.equal(user.phone, '+14155809925');
      t.equal(user.email, null);
    });
});

test('UsersDAO.createSmsPreregistration allows creating SMS preregistration without password', (t) => {
  const sansPassword = Object.assign({}, USER_DATA_WITH_PHONE, { password: null });

  return UsersDAO.createSmsPreregistration(sansPassword)
    .then((user) => {
      t.equal(user.name, 'Q User');
      t.equal(user.id.length, 36);
      t.equal(user.passwordHash, null);
      t.equal(user.phone, '+14155809925');
      t.equal(user.email, null);
      t.equal(user.isSmsPreregistration, true);
    });
});

test('UsersDAO.findByEmail returns null if a user does not exist', (t) => {
  return UsersDAO.findByEmail('fooz@example.com').then((user) => {
    t.equal(user, null);
  });
});

test('UsersDAO.findByEmail returns a user, case insensitive', (t) => {
  return UsersDAO.create(USER_DATA)
    .then(() => UsersDAO.findByEmail('UsEr@ExAmPle.com'))
    .then((user) => {
      t.equal(user.name, 'Q User');
    });
});

test('UsersDAO.findAll returns users', (t) => {
  return UsersDAO.create(USER_DATA)
    .then(() => UsersDAO.findAll({ limit: 1, offset: 0 }))
    .then((users) => {
      t.equal(users.length, 1);
    });
});

test('UsersDAO.findAll respects offset', (t) => {
  return UsersDAO.create(USER_DATA)
    .then(() => UsersDAO.findAll({ limit: 1, offset: 1 }))
    .then((users) => {
      t.equal(users.length, 0);
    });
});

test('UsersDAO.findAll finds based on matching search terms', (t) => {
  return UsersDAO.create(USER_DATA)
    .then(() => UsersDAO.findAll({ limit: 1, offset: 0, search: 'q user' }))
    .then((users) => {
      t.equal(users.length, 1);
    });
});

test('UsersDAO.findAll finds based on matching search terms and role', async (t) => {
  const ADMIN_1 = Object.assign({}, USER_DATA, {
    role: 'ADMIN',
    email: 'user3@example.com'
  });

  const ADMIN_2 = Object.assign({}, USER_DATA, {
    role: 'ADMIN',
    name: 'D User',
    email: 'user4@example.com'
  });

  await Promise.all([
    UsersDAO.create(ADMIN_1),
    UsersDAO.create(ADMIN_2),
    UsersDAO.create(USER_DATA)
  ]);

  const users = await UsersDAO.findAll({
    role: 'ADMIN', search: 'q user', limit: 100, offset: 0
  });
  t.equal(users.length, 1);
});

test('UsersDAO.findAll returns nothing if no search matches', (t) => {
  return UsersDAO.create(USER_DATA)
    .then(() => UsersDAO.findAll({ limit: 1, offset: 0, search: 'flexbox' }))
    .then((users) => {
      t.equal(users.length, 0);
    });
});

test('UsersDAO.update updates a user', (t) => {
  return UsersDAO.create(USER_DATA)
    .then((user) => {
      return UsersDAO.update(user.id, {
        birthday: '2017-01-01'
      });
    })
    .then((user) => {
      t.equal(user.name, 'Q User');
      t.equal(user.birthday, '2017-01-01');
    });
});

test('UsersDAO.completeSmsPreregistration completes a user', (t) => {
  const sansPassword = Object.assign({}, USER_DATA_WITH_PHONE, { password: null });

  return UsersDAO.createSmsPreregistration(sansPassword)
    .then((user) => {
      return UsersDAO.completeSmsPreregistration(user.id, {
        name: 'okie dokie',
        email: 'okie@example.com',
        phone: '415 555 1234',
        password: 'hunter2'
      });
    })
    .then((user) => {
      t.equal(user.name, 'okie dokie');
      t.equal(user.isSmsPreregistration, false);
      t.notEqual(user.passwordHash, 'hunter2');
      t.notEqual(user.passwordHash, null);
      t.equal(user.phone, '+14155551234');
      t.equal(user.email, 'okie@example.com');
    });
});

test('UsersDAO.findByBidId returns all users on a pricing bid', async (t) => {
  const { user: one } = await createUser();
  const { user: two } = await createUser();
  const { user: designer } = await createUser();
  const design = await createDesign({
    productType: 'TEESHIRT',
    title: 'Plain White Tee',
    userId: designer.id
  });
  const { bid, user: admin } = await createBid();

  await DesignEventsDAO.create({
    actorId: admin.id,
    bidId: bid.id,
    createdAt: new Date(),
    designId: design.id,
    id: uuid.v4(),
    targetId: one.id,
    type: 'BID_DESIGN'
  });
  await DesignEventsDAO.create({
    actorId: admin.id,
    bidId: bid.id,
    createdAt: new Date(),
    designId: design.id,
    id: uuid.v4(),
    targetId: two.id,
    type: 'BID_DESIGN'
  });

  const assignees = await UsersDAO.findByBidId(bid.id);

  t.deepEqual(assignees, [one, two]);
});
