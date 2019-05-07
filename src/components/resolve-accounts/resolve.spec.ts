import * as tape from 'tape';
import * as uuid from 'node-uuid';

import createUser = require('../../test-helpers/create-user');
import { sandbox, test } from '../../test-helpers/fresh';
import * as NodeFetch from 'node-fetch';
import { getAllResolveAccountData, hasResolveAccount } from './resolve';
import generateInvoice from '../../test-helpers/factories/invoice';

const resolveResponseData = {
  amount_approved: 100000,
  amount_authorized: 0,
  amount_available: 100000,
  amount_balance: 0,
  approval_pending: false,
  approval_pending_at: null,
  approved: true,
  approved_at: '2019-03-25T22:50:16.984Z',
  business_name: 'Test Buyer account',
  business_trade_name: null,
  denied: false,
  denied_at: null,
  id: 'idabc123456',
  last_charged_at: null,
  merchant_customer_id: 'customer123456'
};

const fetchResponse = {
  json: (): Promise<object> => Promise.resolve(resolveResponseData),
  status: 200
};

test('hasResolveAccount returns if there is a resolve account', async (t: tape.Test) => {
  const fetchStub = sandbox()
    .stub(NodeFetch, 'default')
    .resolves(fetchResponse);

  const id = uuid.v4();
  const response = await hasResolveAccount(id);
  t.equal(fetchStub.calledOnce, true, 'calls to resolve api once');
  t.true(response, 'the account exists');
});

test('hasResolveAccount returns if there is not a resolve account', async (t: tape.Test) => {
  const fetchStub = sandbox()
    .stub(NodeFetch, 'default')
    .resolves({ ...fetchResponse, status: 404 });

  const id = uuid.v4();
  const response = await hasResolveAccount(id);
  t.equal(fetchStub.calledOnce, true, 'calls to resolve api once');
  t.false(response, 'the account exists');
});

test('hasResolveAccount throws if there is a problem', async (t: tape.Test) => {
  sandbox()
    .stub(NodeFetch, 'default')
    .resolves({ ...fetchResponse, status: 500 });

  const id = uuid.v4();
  try {
    await hasResolveAccount(id);
    t.fail('did not throw error');
  } catch (err) {
    t.pass('throws error');
  }
});

test('getAllAccountResolveData returns parsed resolve account data', async (t: tape.Test) => {
  const fetchStub = sandbox()
    .stub(NodeFetch, 'default')
    .resolves(fetchResponse);

  const id = uuid.v4();
  const accounts = [{
    createdAt: new Date(),
    deletedAt: null,
    id,
    resolveCustomerId: uuid.v4(),
    userId: uuid.v4()
  }];

  const response = await getAllResolveAccountData(accounts);
  t.equal(fetchStub.calledOnce, true, 'calls to resolve api once');
  t.equal(response[0].id, id, 'the ids match');
});

test('getAllAccountResolveData returns parsed resolve account data', async (t: tape.Test) => {
  const fetchStub = sandbox()
    .stub(NodeFetch, 'default')
    .resolves(fetchResponse);

  const unTrackedSpend = 1000;
  const { user } = await createUser({ withSession: false });
  await generateInvoice({ userId: user.id, totalCents: unTrackedSpend });
  const id = uuid.v4();
  const accounts = [{
    createdAt: new Date(),
    deletedAt: null,
    id,
    resolveCustomerId: uuid.v4(),
    userId: user.id
  }];

  const response = await getAllResolveAccountData(accounts);
  t.equal(fetchStub.calledOnce, true, 'calls to resolve api once');
  t.equal(response[0].id, id, 'the ids match');
  t.equal(
    response[0].availableAmountCents,
    (resolveResponseData.amount_available * 100) - unTrackedSpend,
    'the untracked spend is subtracted from the available amount');
});

test('getAllAccountResolveData returns parsed multiple accounts data', async (t: tape.Test) => {
  const fetchStub = sandbox()
    .stub(NodeFetch, 'default')
    .resolves(fetchResponse);

  const id1 = uuid.v4();
  const id2 = uuid.v4();
  const accounts = [{
    createdAt: new Date(),
    deletedAt: null,
    id: id1,
    resolveCustomerId: uuid.v4(),
    userId: uuid.v4()
  }, {
    createdAt: new Date(),
    deletedAt: null,
    id: id2,
    resolveCustomerId: uuid.v4(),
    userId: uuid.v4()
  }];

  const response = await getAllResolveAccountData(accounts);
  t.equal(fetchStub.calledTwice, true, 'calls to resolve api twice');
  t.equal(response[0].id, id1, 'the ids match');
  t.equal(response[1].id, id2, 'the ids match');
});

test('getAllAccountResolveData returns parsed multiple accounts data leaving out errors',
async (t: tape.Test) => {
  sandbox()
    .stub(NodeFetch, 'default')
    .rejects();

  const id1 = uuid.v4();
  const id2 = uuid.v4();
  const accounts = [{
    createdAt: new Date(),
    deletedAt: null,
    id: id1,
    resolveCustomerId: uuid.v4(),
    userId: uuid.v4()
  }, {
    createdAt: new Date(),
    deletedAt: null,
    id: id2,
    resolveCustomerId: uuid.v4(),
    userId: uuid.v4()
  }];

  try {
    await getAllResolveAccountData(accounts);
    t.fail('did not throw!');
  } catch (err) {
    t.pass('throws error');
  }
});
