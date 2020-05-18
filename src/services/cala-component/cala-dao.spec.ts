import Knex from 'knex';
import uuid from 'node-uuid';

import { buildDao } from './cala-dao';
import { buildAdapter } from './cala-adapter';
import { sandbox, test, Test } from '../../test-helpers/fresh';
import { tableName } from '../../dao/addresses';
import generateAddress from '../../test-helpers/factories/address';
import * as PubSub from '../../services/pubsub';
import db from '../../services/db';
import { omit } from 'lodash';

interface Address {
  id: string;
  createdAt: Date | null;
  deletedAt: Date | null;
  userId: string | null;
  companyName: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  region: string;
  postCode: string;
  country: string;
}
interface AddressRow {
  id: string;
  created_at: Date | null;
  deleted_at: Date | null;
  user_id: string | null;
  company_name: string | null;
  address_line1: string;
  address_line2: string | null;
  city: string;
  region: string;
  post_code: string;
  country: string;
}

test('standard cala-dao', async (t: Test) => {
  sandbox().useFakeTimers(new Date());
  const domain = 'address';
  const adapter = buildAdapter<Address, AddressRow>({
    domain,
    requiredProperties: [
      'userId',
      'addressLine1',
      'city',
      'region',
      'postCode',
      'country'
    ]
  });
  const dao = buildDao<Address, AddressRow>(domain, tableName, adapter, {
    orderColumn: 'created_at'
  });

  const a1: Address = await generateAddress({
    country: 'USA',
    city: 'NY',
    companyName: 'Cala',
    postCode: '1'
  });
  const a2: Address = await generateAddress({
    country: 'USA',
    city: 'SF',
    companyName: 'Cala',
    postCode: '2'
  });
  const a3: Address = await generateAddress({
    country: 'USA',
    city: 'SF',
    companyName: 'Apple',
    postCode: '3'
  });

  const emitStub = sandbox().stub(PubSub, 'emit');

  const describeFind = async (): Promise<void> => {
    interface TestCase {
      title: string;
      filter: Partial<Address>;
      result: Address[];
      modifier?: (query: Knex.QueryBuilder) => Knex.QueryBuilder;
    }
    const testCases: TestCase[] = [
      {
        title: 'Empty filter',
        filter: {},
        result: [a1, a2, a3]
      },
      {
        title: 'One',
        filter: { companyName: a3.companyName },
        result: [a3]
      },
      {
        title: 'Some by companyName',
        filter: { companyName: a1.companyName },
        result: [a1, a2]
      },
      {
        title: 'Some by city',
        filter: { city: a2.city },
        result: [a2, a3]
      },
      {
        title: 'Empty result',
        filter: { city: 'LA' },
        result: []
      },
      {
        title: 'Apply modifier',
        filter: { country: a1.country },
        modifier: (query: Knex.QueryBuilder): Knex.QueryBuilder =>
          query.offset(1).limit(1),
        result: [a2]
      },
      {
        title: 'Apply modifier (sort)',
        filter: { country: a1.country },
        modifier: (query: Knex.QueryBuilder): Knex.QueryBuilder =>
          query.clearOrder().orderBy('post_code', 'DESC'),
        result: [a3, a2, a1]
      }
    ];
    for (const testCase of testCases) {
      const trx = await db.transaction();
      try {
        const result = await (testCase.modifier
          ? dao.find(trx, testCase.filter, testCase.modifier)
          : dao.find(trx, testCase.filter));
        t.deepEqual(result, testCase.result, `find / ${testCase.title}`);
        t.deepEqual(
          emitStub.args,
          [],
          `find / ${testCase.title}, no emit() called`
        );
      } finally {
        await trx.rollback();
        emitStub.resetHistory();
      }
    }
  };
  await describeFind();

  const describeFindOne = async (): Promise<void> => {
    interface TestCase {
      title: string;
      filter: Partial<Address>;
      result: Address | null;
      modifier?: (query: Knex.QueryBuilder) => Knex.QueryBuilder;
    }
    const testCases: TestCase[] = [
      {
        title: 'Empty filter',
        filter: {},
        result: a1
      },
      {
        title: 'Single match',
        filter: { companyName: a3.companyName },
        result: a3
      },
      {
        title: 'Multiple match',
        filter: { companyName: a1.companyName },
        result: a1
      },
      {
        title: 'Single match by complex filter',
        filter: { companyName: a1.companyName, city: a2.city },
        result: a2
      },
      {
        title: 'Zero match',
        filter: { city: 'LA' },
        result: null
      },
      {
        title: 'Apply modifier (sort)',
        filter: { country: a1.country },
        modifier: (query: Knex.QueryBuilder): Knex.QueryBuilder =>
          query.clearOrder().orderBy('post_code', 'desc'),
        result: a3
      }
    ];
    for (const testCase of testCases) {
      const trx = await db.transaction();
      try {
        const result = await (testCase.modifier
          ? dao.findOne(trx, testCase.filter, testCase.modifier)
          : dao.findOne(trx, testCase.filter));
        t.deepEqual(result, testCase.result, `findOne / ${testCase.title}`);
        t.deepEqual(
          emitStub.args,
          [],
          `findOne / ${testCase.title}, no emit() called`
        );
      } finally {
        await trx.rollback();
        emitStub.resetHistory();
      }
    }
  };
  await describeFindOne();

  const describeFindById = async (): Promise<void> => {
    interface TestCase {
      title: string;
      id: string;
      result: Address | null;
    }
    const testCases: TestCase[] = [
      {
        title: 'Existing id',
        id: a3.id,
        result: a3
      },
      {
        title: 'Non-existing id',
        id: uuid.v4(),
        result: null
      }
    ];
    for (const testCase of testCases) {
      const trx = await db.transaction();
      try {
        const result = await dao.findById(trx, testCase.id).catch(trx.rollback);
        t.deepEqual(result, testCase.result, `findById / ${testCase.title}`);
        t.deepEqual(
          emitStub.args,
          [],
          `findById / ${testCase.title}, no emit() called`
        );
      } finally {
        await trx.rollback();
        emitStub.resetHistory();
      }
    }
  };
  await describeFindById();

  const describeCreate = async (): Promise<void> => {
    const trx = await db.transaction();
    const a4 = {
      ...a1,
      id: uuid.v4()
    };
    try {
      const result = await dao.create(trx, a4);

      t.deepEqual(
        omit(result, 'createdAt'),
        omit(a4, 'createdAt'),
        `create / returned result`
      );

      const found = await dao.findById(trx, a4.id);
      t.deepEqual(
        omit(found, 'createdAt'),
        omit(a4, 'createdAt'),
        `create / found result`
      );

      t.deepEqual(
        emitStub.args,
        [['dao.created', 'address', { created: result, trx }]],
        `create / no emit() called`
      );
    } finally {
      await trx.rollback();
      emitStub.resetHistory();
    }
  };
  await describeCreate();

  const describeCreateAll = async (): Promise<void> => {
    const trx = await db.transaction();
    const a4 = {
      ...a1,
      id: uuid.v4(),
      country: 'Zimbabwe'
    };
    const a5 = {
      ...a2,
      id: uuid.v4(),
      country: 'Zimbabwe'
    };
    try {
      const result = await dao.createAll(trx, [a4, a5]).catch(trx.rollback);

      t.deepEqual(
        result.map((item: Address) => omit(item, 'createdAt')),
        [a4, a5].map((item: Address) => omit(item, 'createdAt')),
        `createAll / returned result`
      );

      const found = await dao
        .find(trx, { country: 'Zimbabwe' })
        .catch(trx.rollback);
      t.deepEqual(
        found.map((item: Address) => omit(item, 'createdAt')),
        [a4, a5].map((item: Address) => omit(item, 'createdAt')),
        `createAll / returned result`
      );

      t.deepEqual(
        emitStub.args,
        [
          ['dao.created', 'address', { created: result[0], trx }],
          ['dao.created', 'address', { created: result[1], trx }]
        ],
        `createAll / no emit() called`
      );
    } finally {
      await trx.rollback();
      emitStub.resetHistory();
    }
  };
  await describeCreateAll();

  const describeUpdate = async (): Promise<void> => {
    interface TestCase {
      title: string;
      id: string;
      patch: Partial<Address>;
      errorMessage?: string;
      before?: Address;
      result?: Address;
      emitCalls: any[][];
    }
    const wrongId = uuid.v4();
    const testCases: TestCase[] = [
      {
        title: 'Simple',
        id: a1.id,
        patch: { city: 'LA' },
        before: a1,
        result: { ...a1, city: 'LA' },
        emitCalls: [
          [
            'dao.updating',
            'address',
            {
              before: a1,
              patch: { city: 'LA' }
            }
          ],
          [
            'dao.updated',
            'address',
            {
              before: a1,
              updated: { ...a1, city: 'LA' }
            }
          ]
        ]
      },
      {
        title: 'Not found',
        id: wrongId,
        patch: { city: 'LA' },
        errorMessage: `Could not find ${tableName} #${wrongId}`,
        emitCalls: []
      },
      {
        title: 'Patch with id',
        id: a1.id,
        patch: { city: 'LA', id: wrongId },
        errorMessage: `Patch should not contain id!`,
        emitCalls: []
      }
    ];

    for (const testCase of testCases) {
      const trx = await db.transaction();
      try {
        if (testCase.errorMessage) {
          try {
            await dao.update(trx, testCase.id, testCase.patch);
            t.fail(`update / ${testCase.title} / didn't throw expected error`);
          } catch (err) {
            t.is(
              err.message,
              testCase.errorMessage,
              `update / ${testCase.title} / throws expected error`
            );
          }
        } else {
          const resultReturned = await dao
            .update(trx, testCase.id, testCase.patch)
            .catch(trx.rollback);

          t.deepEqual(
            resultReturned,
            { before: testCase.before, updated: testCase.result },
            `update / ${testCase.title} / returned result`
          );

          const resultFound = await dao
            .findById(trx, testCase.id)
            .catch(trx.rollback);
          t.deepEqual(
            resultFound,
            testCase.result,
            `update / ${testCase.title} / found result`
          );
        }
        testCase.emitCalls.forEach((call: any[]) => {
          call[2].trx = trx;
        });
        t.deepEqual(
          emitStub.args,
          testCase.emitCalls,
          `update / ${testCase.title} / proper emit calls`
        );
        emitStub.resetHistory();
      } finally {
        await trx.rollback();
      }
    }
  };
  await describeUpdate();
});
