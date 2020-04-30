import uuid from 'node-uuid';
import Knex from 'knex';

import InvalidDataError = require('../../errors/invalid-data');
import * as UsersDAO from './dao';
import * as DesignEventsDAO from '../../dao/design-events';
import { sandbox, test, Test } from '../../test-helpers/fresh';
import createUser = require('../../test-helpers/create-user');
import createBid from '../../test-helpers/factories/bid';
import ProductDesignsDAO from '../product-designs/dao';
import User, { ROLES, UserIO } from './domain-object';
import { validatePassword } from './services/validate-password';
import db from '../../services/db';
import * as MailChimpFunctions from '../../services/mailchimp/update-email';
import generateDesignEvent from '../../test-helpers/factories/design-event';
import PayoutAccountsDAO = require('../../dao/partner-payout-accounts');
import PartnerPayoutsDAO = require('../../components/partner-payouts/dao');
import generateCollection from '../../test-helpers/factories/collection';
import { addDesign } from '../../test-helpers/collections';

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
    .then(() => {
      throw new Error("Shouldn't get here");
    })
    .catch((err: Error) => {
      t.ok(err instanceof InvalidDataError);
    });
});

test('UsersDAO.create fails when password is missing', (t: Test) => {
  return UsersDAO.create({ name: 'Q User', email: 'fooz@example.com' } as any)
    .then(() => {
      throw new Error("Shouldn't get here");
    })
    .catch((err: Error) => {
      t.ok(err instanceof InvalidDataError);
      t.equal(err.message, 'Missing required information');
    });
});

test('UsersDAO.create fails if email already exists', (t: Test) => {
  return UsersDAO.create(USER_DATA)
    .then(() => UsersDAO.create(USER_DATA))
    .then(() => {
      throw new Error("Shouldn't get here");
    })
    .catch((err: Error) => {
      t.ok(err instanceof InvalidDataError);
      t.equal(err.message, 'Email is already taken');
    });
});

test('UsersDAO.create fails if phone already exists', (t: Test) => {
  return UsersDAO.create(USER_DATA_WITH_PHONE)
    .then(() => UsersDAO.create(USER_DATA_WITH_PHONE))
    .then(() => {
      throw new Error("Shouldn't get here");
    })
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
    .then(() => {
      throw new Error("Shouldn't get here");
    })
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
    .then(() => {
      throw new Error("Shouldn't get here");
    })
    .catch((err: Error) => {
      t.ok(err instanceof InvalidDataError);
      t.equal(err.message, 'Invalid country calling code');
    });
});

test('UsersDAO.create returns a new user with email but no phone', (t: Test) => {
  return UsersDAO.create(USER_DATA).then((user: User) => {
    t.equal(user.name, 'Q User');
    t.equal(user.email, 'user@example.com');
    t.equal(user.locale, 'en');
    t.equal(user.id.length, 36);
    t.equal(user.phone, null);
    t.equal(user.isSmsPreregistration, false);
  });
});

test('UsersDAO.create returns a new user with phone but no email', (t: Test) => {
  return UsersDAO.create(USER_DATA_WITH_PHONE).then((user: User) => {
    t.equal(user.name, 'Q User');
    t.equal(user.id.length, 36);
    t.equal(user.phone, '+14155809925');
    t.equal(user.locale, 'en');
    t.equal(user.email, null);
  });
});

test('UsersDAO.createSmsPreregistration allows creating SMS preregistration without password', (t: Test) => {
  const sansPassword = Object.assign({}, USER_DATA_WITH_PHONE, {
    password: null
  });

  return UsersDAO.createSmsPreregistration(sansPassword).then((user: User) => {
    t.equal(user.name, 'Q User');
    t.equal(user.id.length, 36);
    t.equal(user.phone, '+14155809925');
    t.equal(user.locale, 'en');
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
    name: 'Kanye West',
    locale: 'zh'
  });
  t.equal(user.name, 'Kanye West', 'name returned is updated');
  t.equal(user.locale, 'zh', 'locale returned is updated');
});

test('UsersDAO.update throw on already taken email', async (t: Test) => {
  const user1 = await UsersDAO.create(USER_DATA);
  const user2 = await UsersDAO.create({
    ...USER_DATA,
    email: 'example@user.com'
  });
  try {
    await UsersDAO.update(user2.id, {
      email: user1.email
    });
  } catch (err) {
    t.equal(err.constraint, 'users_unique_email');
  }
});

test('UsersDAO.update updates MailChimp email if email is updated', async (t: Test) => {
  const updateEmailStub = sandbox().stub(MailChimpFunctions, 'updateEmail');

  const user = await UsersDAO.create(USER_DATA);
  await UsersDAO.update(user.id, {
    email: 'new@email.com'
  });
  t.equal(updateEmailStub.callCount, 1);
});

test('UsersDAO.updatePassword updates password', async (t: Test) => {
  const inserted = await UsersDAO.create(USER_DATA);
  const updated = await UsersDAO.updatePassword(inserted.id, 'P@ssw0rd');
  const wrongPasswordCheck = await validatePassword(updated.id, 'hunter2');
  const correctPasswordCheck = await validatePassword(updated.id, 'P@ssw0rd');
  t.false(wrongPasswordCheck);
  t.true(correctPasswordCheck);
});

test('UsersDAO.completeSmsPreregistration completes a user', (t: Test) => {
  const sansPassword = Object.assign({}, USER_DATA_WITH_PHONE, {
    password: null
  });

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
      t.equal(user.locale, 'en');
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

  await db.transaction(async (trx: Knex.Transaction) => {
    await DesignEventsDAO.create(trx, {
      actorId: admin.id,
      bidId: bid.id,
      createdAt: new Date(),
      designId: design.id,
      id: uuid.v4(),
      quoteId: null,
      targetId: one.id,
      approvalStepId: null,
      approvalSubmissionId: null,
      type: 'BID_DESIGN'
    });
    await DesignEventsDAO.create(trx, {
      actorId: admin.id,
      bidId: bid.id,
      createdAt: new Date(),
      designId: design.id,
      id: uuid.v4(),
      quoteId: null,
      targetId: two.id,
      approvalStepId: null,
      approvalSubmissionId: null,
      type: 'BID_DESIGN'
    });
  });

  const assignees = await UsersDAO.findByBidId(bid.id);

  t.deepEqual(assignees, [one, two]);
});

test('UsersDAO.findAllUnpaidPartners returns all unpaid partners', async (t: Test) => {
  sandbox().useFakeTimers(new Date(2020, 2, 0));
  const { user: designer } = await createUser();
  const { user: unpaidPartner } = await createUser({ role: 'PARTNER' });

  const design = await ProductDesignsDAO.create({
    productType: 'TEESHIRT',
    title: 'Plain White Tee',
    userId: designer.id
  });

  const { collection } = await generateCollection({ createdBy: designer.id });
  await addDesign(collection.id, design.id);
  const { bid, user: admin } = await createBid({
    bidOptions: { bidPriceCents: 1000 },
    designId: design.id
  });

  await db.transaction(async (trx: Knex.Transaction) => {
    await DesignEventsDAO.create(trx, {
      actorId: admin.id,
      bidId: bid.id,
      createdAt: new Date(),
      designId: design.id,
      id: uuid.v4(),
      quoteId: null,
      targetId: unpaidPartner.id,
      approvalStepId: null,
      approvalSubmissionId: null,
      type: 'BID_DESIGN'
    });
  });
  await generateDesignEvent({
    type: 'ACCEPT_SERVICE_BID',
    bidId: bid.id,
    actorId: unpaidPartner.id,
    designId: design.id,
    createdAt: new Date()
  });

  const { user: designer2 } = await createUser();
  const { user: paidPartner } = await createUser({ role: 'PARTNER' });

  const design2 = await ProductDesignsDAO.create({
    productType: 'TEESHIRT',
    title: 'Plain White Tee',
    userId: designer2.id
  });
  const { collection: collection2 } = await generateCollection({
    createdBy: designer.id
  });
  await addDesign(collection2.id, design2.id);
  const { bid: bid2, user: admin2 } = await createBid({
    bidOptions: { bidPriceCents: 1000 },
    designId: design2.id
  });

  await db.transaction(async (trx: Knex.Transaction) => {
    await DesignEventsDAO.create(trx, {
      actorId: admin2.id,
      bidId: bid2.id,
      createdAt: new Date(),
      designId: design2.id,
      id: uuid.v4(),
      quoteId: null,
      targetId: paidPartner.id,
      approvalStepId: null,
      approvalSubmissionId: null,
      type: 'BID_DESIGN'
    });
  });
  await generateDesignEvent({
    type: 'ACCEPT_SERVICE_BID',
    bidId: bid2.id,
    actorId: paidPartner.id,
    designId: design2.id,
    createdAt: new Date()
  });

  const payoutAccount = await PayoutAccountsDAO.create({
    id: uuid.v4(),
    createdAt: new Date(),
    deletedAt: null,
    userId: paidPartner.id,
    stripeAccessToken: 'stripe-access-one',
    stripeRefreshToken: 'stripe-refresh-one',
    stripePublishableKey: 'stripe-publish-one',
    stripeUserId: 'stripe-user-one'
  });

  const data = {
    id: uuid.v4(),
    invoiceId: null,
    payoutAccountId: payoutAccount.id,
    payoutAmountCents: 1000,
    message: 'Get yo money',
    initiatorUserId: admin.id,
    bidId: bid2.id,
    isManual: false
  };
  await PartnerPayoutsDAO.create(data);

  const users = await UsersDAO.findAllUnpaidPartners({ limit: 20, offset: 0 });

  t.deepEqual(users, [unpaidPartner]);
});

test('UsersDAO.findAllUnpaidPartners does not include partners removed from bids', async (t: Test) => {
  sandbox().useFakeTimers(new Date(2020, 2, 0));
  const { user: designer } = await createUser();
  const { user: unpaidPartner } = await createUser({ role: 'PARTNER' });

  const design = await ProductDesignsDAO.create({
    productType: 'TEESHIRT',
    title: 'Plain White Tee',
    userId: designer.id
  });

  const { collection } = await generateCollection({ createdBy: designer.id });
  await addDesign(collection.id, design.id);
  const { bid, user: admin } = await createBid({
    bidOptions: { bidPriceCents: 1000 },
    designId: design.id
  });

  await db.transaction(async (trx: Knex.Transaction) => {
    await DesignEventsDAO.create(trx, {
      actorId: admin.id,
      bidId: bid.id,
      createdAt: new Date(),
      designId: design.id,
      id: uuid.v4(),
      quoteId: null,
      targetId: unpaidPartner.id,
      approvalStepId: null,
      approvalSubmissionId: null,
      type: 'BID_DESIGN'
    });
  });
  await generateDesignEvent({
    type: 'ACCEPT_SERVICE_BID',
    bidId: bid.id,
    actorId: unpaidPartner.id,
    designId: design.id,
    createdAt: new Date()
  });

  const { user: designer2 } = await createUser();
  const { user: paidPartner } = await createUser({ role: 'PARTNER' });

  const design2 = await ProductDesignsDAO.create({
    productType: 'TEESHIRT',
    title: 'Plain White Tee',
    userId: designer2.id
  });
  const { collection: collection2 } = await generateCollection({
    createdBy: designer.id
  });
  await addDesign(collection2.id, design2.id);
  const { bid: bid2, user: admin2 } = await createBid({
    bidOptions: { bidPriceCents: 1000 },
    designId: design2.id
  });

  await db.transaction(async (trx: Knex.Transaction) => {
    await DesignEventsDAO.create(trx, {
      actorId: admin2.id,
      bidId: bid2.id,
      createdAt: new Date(),
      designId: design2.id,
      id: uuid.v4(),
      quoteId: null,
      targetId: paidPartner.id,
      approvalStepId: null,
      approvalSubmissionId: null,
      type: 'BID_DESIGN'
    });
  });
  await generateDesignEvent({
    type: 'ACCEPT_SERVICE_BID',
    bidId: bid2.id,
    actorId: paidPartner.id,
    designId: design2.id,
    createdAt: new Date()
  });
  await generateDesignEvent({
    type: 'REMOVE_PARTNER',
    bidId: bid2.id,
    actorId: admin2.id,
    targetId: paidPartner.id,
    designId: design2.id,
    createdAt: new Date()
  });

  const users = await UsersDAO.findAllUnpaidPartners({ limit: 20, offset: 0 });

  t.deepEqual(users, [unpaidPartner]);
});

test('UsersDAO.create allows passing in a transaction', async (t: Test) => {
  let userId;

  try {
    await db.transaction(async (trx: Knex.Transaction) => {
      const user = await UsersDAO.create(USER_DATA, { trx });
      t.equal(user.name, 'Q User');
      userId = user.id;
      throw new Error('Cancel the transaction');
    });
  } catch (err) {
    /* noop */
  }

  if (!userId) {
    throw new Error('Missing user ID');
  }

  const afterTrx = await UsersDAO.findById(userId);
  t.equal(afterTrx, null);
});

test('UsersDAO.findById allows passing in a transaction', async (t: Test) => {
  await db.transaction(async (trx: Knex.Transaction) => {
    const created = await UsersDAO.create(USER_DATA, { trx });
    const found = await UsersDAO.findById(created.id, trx);
    t.equal(found && found.name, 'Q User');
  });
});

test('UsersDAO.hasPasswordSet checks to see if a password is set', async (t: Test) => {
  await db.transaction(async (trx: Knex.Transaction) => {
    const complete = await UsersDAO.create(USER_DATA, {
      trx,
      requirePassword: false
    });
    t.true(await UsersDAO.hasPasswordSet(complete.id, trx));

    const incomplete = await UsersDAO.create(
      { ...USER_DATA, email: 'unique@example.com', password: null },
      { trx, requirePassword: false }
    );
    t.false(await UsersDAO.hasPasswordSet(incomplete.id, trx));
  });
});
