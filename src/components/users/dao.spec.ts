import * as uuid from 'node-uuid';

import InvalidDataError = require('../../errors/invalid-data');
import * as UsersDAO from './dao';
import * as DesignEventsDAO from '../../dao/design-events';
import { test, Test } from '../../test-helpers/fresh';
import createUser = require('../../test-helpers/create-user');
import createBid from '../../test-helpers/factories/bid';
import * as ProductDesignsDAO from '../../dao/product-designs';
import User, { ROLES, UserIO } from './domain-object';

const USER_DATA: UserIO = Object.freeze({
  email: 'USER@example.com',
  name: 'Q User',
  password: 'hunter2',
  referralCode: 'freebie'
});

const USER_DATA_WITH_PHONE: UserIO = Object.assign({}, USER_DATA, {
  email: null,
  phone: '415 580 9925'
});

test('UsersDAO.create fails when email or phone is missing', (t: Test) => {
  return UsersDAO.create({ name: 'Q User', password: 'hunter2' } as any)
    .then(() => { throw new Error("Shouldn't get here"); })
    .catch((err: Error) => {
      t.ok(err instanceof InvalidDataError);
    });
});

test('UsersDAO.create fails when password is missing', (t: Test) => {
  return UsersDAO.create({ name: 'Q User', email: 'fooz@example.com' } as any)
    .then(() => { throw new Error("Shouldn't get here"); })
    .catch((err: Error) => {
      t.ok(err instanceof InvalidDataError);
      t.equal(err.message, 'Missing required information');
    });
});

test('UsersDAO.create fails if email already exists', (t: Test) => {
  return UsersDAO.create(USER_DATA)
    .then(() => UsersDAO.create(USER_DATA))
    .then(() => { throw new Error("Shouldn't get here"); })
    .catch((err: Error) => {
      t.ok(err instanceof InvalidDataError);
      t.equal(err.message, 'Email is already taken');
    });
});

test('UsersDAO.create fails if phone already exists', (t: Test) => {
  return UsersDAO.create(USER_DATA_WITH_PHONE)
    .then(() => UsersDAO.create(USER_DATA_WITH_PHONE))
    .then(() => { throw new Error("Shouldn't get here"); })
    .catch((err: Error) => {
      t.ok(err instanceof InvalidDataError);
      t.equal(err.message, 'Phone number is already taken');
    });
});

test('UsersDAO.create fails if email is invalid', (t: Test) => {
  return UsersDAO.create({
    email: 'user at example.com',
    name: 'Q User',
    password: 'hunter2'
  })
    .then(() => { throw new Error("Shouldn't get here"); })
    .catch((err: Error) => {
      t.ok(err instanceof InvalidDataError);
      t.equal(err.message, 'Invalid email');
    });
});

test('UsersDAO.create fails if phone is invalid', (t: Test) => {
  return UsersDAO.create({
    email: 'user@example.com',
    name: 'Q User',
    password: 'hunter2',
    phone: '911'
  })
    .then(() => { throw new Error("Shouldn't get here"); })
    .catch((err: Error) => {
      t.ok(err instanceof InvalidDataError);
      t.equal(err.message, 'Invalid country calling code');
    });
});

test('UsersDAO.create returns a new user with email but no phone', (t: Test) => {
  return UsersDAO.create(USER_DATA)
    .then((user: User) => {
      t.equal(user.name, 'Q User');
      t.equal(user.email, 'user@example.com');
      t.equal(user.id.length, 36);
      t.equal(user.phone, null);
      t.equal(user.isSmsPreregistration, false);
    });
});

test('UsersDAO.create returns a new user with phone but no email', (t: Test) => {
  return UsersDAO.create(USER_DATA_WITH_PHONE)
    .then((user: User) => {
      t.equal(user.name, 'Q User');
      t.equal(user.id.length, 36);
      t.equal(user.phone, '+14155809925');
      t.equal(user.email, null);
    });
});

test('UsersDAO.createSmsPreregistration allows creating SMS preregistration without password',
(t: Test) => {
  const sansPassword = Object.assign({}, USER_DATA_WITH_PHONE, { password: null });

  return UsersDAO.createSmsPreregistration(sansPassword)
    .then((user: User) => {
      t.equal(user.name, 'Q User');
      t.equal(user.id.length, 36);
      t.equal(user.phone, '+14155809925');
      t.equal(user.email, null);
      t.equal(user.isSmsPreregistration, true);
    });
});

test('UsersDAO.findByEmail returns null if a user does not exist', (t: Test) => {
  return UsersDAO.findByEmail('fooz@example.com').then((user: User | null) => {
    t.equal(user, null, 'returns null');
  });
});

test('UsersDAO.findByEmail returns a user, case insensitive', (t: Test) => {
  return UsersDAO.create(USER_DATA)
    .then(() => UsersDAO.findByEmail('UsEr@ExAmPle.com'))
    .then((user: User | null) => {
      t.equal(user && user.name, 'Q User');
    });
});

test('UsersDAO.findAll returns users', (t: Test) => {
  return UsersDAO.create(USER_DATA)
    .then(() => UsersDAO.findAll({ limit: 1, offset: 0 }))
    .then((users: User[]) => {
      t.equal(users.length, 1);
    });
});

test('UsersDAO.findAll respects offset', (t: Test) => {
  return UsersDAO.create(USER_DATA)
    .then(() => UsersDAO.findAll({ limit: 1, offset: 1 }))
    .then((users: User[]) => {
      t.equal(users.length, 0);
    });
});

test('UsersDAO.findAll finds based on matching search terms', (t: Test) => {
  return UsersDAO.create(USER_DATA)
    .then(() => UsersDAO.findAll({ limit: 1, offset: 0, search: 'q user' }))
    .then((users: User[]) => {
      t.equal(users.length, 1);
    });
});

test('UsersDAO.findAll finds based on matching search terms and role', async (t: Test) => {
  const ADMIN_1 = Object.assign({}, USER_DATA, {
    email: 'user3@example.com',
    role: 'ADMIN'
  });

  const ADMIN_2 = Object.assign({}, USER_DATA, {
    email: 'user4@example.com',
    name: 'D User',
    role: 'ADMIN'
  });

  await Promise.all([
    UsersDAO.create(ADMIN_1),
    UsersDAO.create(ADMIN_2),
    UsersDAO.create(USER_DATA)
  ]);

  const users = await UsersDAO.findAll({
    limit: 100,
    offset: 0,
    role: ROLES.admin,
    search: 'q user'
  });
  t.equal(users.length, 1, 'finds one user');
});

test('UsersDAO.findAll returns nothing if no search matches', (t: Test) => {
  return UsersDAO.create(USER_DATA)
    .then(() => UsersDAO.findAll({ limit: 1, offset: 0, search: 'flexbox' }))
    .then((users: User[]) => {
      t.equal(users.length, 0, 'no users are returned');
    });
});

test('UsersDAO.update updates a user', async (t: Test) => {
  const inserted = await UsersDAO.create(USER_DATA);
  const user = await UsersDAO.update(inserted.id, {
    name: 'Kanye West'
  });
  t.equal(user.name, 'Kanye West', 'name returned is updated');
});

test('UsersDAO.completeSmsPreregistration completes a user', (t: Test) => {
  const sansPassword = Object.assign({}, USER_DATA_WITH_PHONE, { password: null });

  return UsersDAO.createSmsPreregistration(sansPassword)
    .then((user: User) => {
      return UsersDAO.completeSmsPreregistration(user.id, {
        email: 'okie@example.com',
        name: 'okie dokie',
        password: 'hunter2',
        phone: '415 555 1234'
      });
    })
    .then((user: User) => {
      t.equal(user.name, 'okie dokie');
      t.equal(user.isSmsPreregistration, false);
      t.equal(user.phone, '+14155551234');
      t.equal(user.email, 'okie@example.com');
    });
});

test('UsersDAO.findByBidId returns all users on a pricing bid', async (t: Test) => {
  const { user: one } = await createUser();
  const { user: two } = await createUser();
  const { user: designer } = await createUser();
  const design = await ProductDesignsDAO.create({
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
    quoteId: null,
    targetId: one.id,
    type: 'BID_DESIGN'
  });
  await DesignEventsDAO.create({
    actorId: admin.id,
    bidId: bid.id,
    createdAt: new Date(),
    designId: design.id,
    id: uuid.v4(),
    quoteId: null,
    targetId: two.id,
    type: 'BID_DESIGN'
  });

  const assignees = await UsersDAO.findByBidId(bid.id);

  t.deepEqual(assignees, [one, two]);
});