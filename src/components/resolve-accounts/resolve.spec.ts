import tape from 'tape';
import uuid from 'node-uuid';

import createUser from '../../test-helpers/create-user';
import { sandbox, test } from '../../test-helpers/fresh';
import * as Fetch from '../../services/fetch';
import { getAllResolveAccountData, hasResolveAccount } from './resolve';
import generateInvoice from '../../test-helpers/factories/invoice';

const resolveResponseData = {
  approved_at: '2019-03-25T22:50:16.984Z',
  amount_available: 100000,
  amount_balance: 0,
  business_name: 'Test Buyer account',
  approved: true,
  amount_approved: 100000
};

const fetchResponse = {
  json: (): Promise<object> => Promise.resolve(resolveResponseData),
  status: 200
};

test('hasResolveAccount returns if there is a resolve account', async (t: tape.Test) => {
  const fetchStub = sandbox()
    .stub(Fetch, 'fetch')
    .resolves(fetchResponse);

  const id = uuid.v4();
  const response = await hasResolveAccount(id);
  t.equal(fetchStub.calledOnce, true, 'calls to resolve api once');
  t.true(response, 'the account exists');
});

test('hasResolveAccount returns if there is not a resolve account', async (t: tape.Test) => {
  const fetchStub = sandbox()
    .stub(Fetch, 'fetch')
    .resolves({ ...fetchResponse, status: 404 });

  const id = uuid.v4();
  const response = await hasResolveAccount(id);
  t.equal(fetchStub.calledOnce, true, 'calls to resolve api once');
  t.false(response, 'the account exists');
});

test('hasResolveAccount throws if there is a problem', async (t: tape.Test) => {
  sandbox()
    .stub(Fetch, 'fetch')
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
    .stub(Fetch, 'fetch')
    .resolves(fetchResponse);

  const id = uuid.v4();
  const accounts = [
    {
      createdAt: new Date(),
      deletedAt: null,
      id,
      resolveCustomerId: uuid.v4(),
      userId: uuid.v4()
    }
  ];

  const response = await getAllResolveAccountData(accounts);
  t.equal(fetchStub.calledOnce, true, 'calls to resolve api once');
  t.equal(response[0].id, id, 'the ids match');
});

test('getAllAccountResolveData returns parsed resolve account data', async (t: tape.Test) => {
  const fetchStub = sandbox()
    .stub(Fetch, 'fetch')
    .resolves(fetchResponse);

  const unTrackedSpend = 1000;
  const { user } = await createUser({ withSession: false });
  await generateInvoice({ userId: user.id, totalCents: unTrackedSpend });
  const id = uuid.v4();
  const accounts = [
    {
      createdAt: new Date(),
      deletedAt: null,
      id,
      resolveCustomerId: uuid.v4(),
      userId: user.id
    }
  ];

  const response = await getAllResolveAccountData(accounts);
  t.equal(fetchStub.calledOnce, true, 'calls to resolve api once');
  t.equal(response[0].id, id, 'the ids match');
  t.equal(
    response[0].availableAmountCents,
    resolveResponseData.amount_available * 100 - unTrackedSpend,
    'the untracked spend is subtracted from the available amount'
  );
});

test('getAllAccountResolveData returns parsed multiple accounts data', async (t: tape.Test) => {
  const fetchStub = sandbox()
    .stub(Fetch, 'fetch')
    .resolves(fetchResponse);

  const id1 = uuid.v4();
  const id2 = uuid.v4();
  const accounts = [
    {
      createdAt: new Date(),
      deletedAt: null,
      id: id1,
      resolveCustomerId: uuid.v4(),
      userId: uuid.v4()
    },
    {
      createdAt: new Date(),
      deletedAt: null,
      id: id2,
      resolveCustomerId: uuid.v4(),
      userId: uuid.v4()
    }
  ];

  const response = await getAllResolveAccountData(accounts);
  t.equal(fetchStub.calledTwice, true, 'calls to resolve api twice');
  t.equal(response[0].id, id1, 'the ids match');
  t.equal(response[1].id, id2, 'the ids match');
});

test('getAllAccountResolveData returns parsed multiple accounts data leaving out errors', async (t: tape.Test) => {
  sandbox()
    .stub(Fetch, 'fetch')
    .rejects();

  const id1 = uuid.v4();
  const id2 = uuid.v4();
  const accounts = [
    {
      createdAt: new Date(),
      deletedAt: null,
      id: id1,
      resolveCustomerId: uuid.v4(),
      userId: uuid.v4()
    },
    {
      createdAt: new Date(),
      deletedAt: null,
      id: id2,
      resolveCustomerId: uuid.v4(),
      userId: uuid.v4()
    }
  ];

  try {
    await getAllResolveAccountData(accounts);
    t.fail('did not throw!');
  } catch (err) {
    t.pass('throws error');
  }
});
