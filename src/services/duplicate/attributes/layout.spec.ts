import * as Knex from 'knex';
import * as uuid from 'node-uuid';
import { omit } from 'lodash';

import { sandbox, test, Test } from '../../../test-helpers/fresh';
import * as db from '../../../services/db';
import findAndDuplicateLayout from './layout';
import generateLayoutAttribute from '../../../test-helpers/factories/layout-attribute';
import createUser = require('../../../test-helpers/create-user');
import generateNode from '../../../test-helpers/factories/node';
import * as LayoutsDAO from '../../../components/attributes/layout-attributes/dao';

test('findAndDuplicateLayout() failure case', async (t: Test) => {
  const d1 = uuid.v4();
  const userId = uuid.v4();
  const nodeId = uuid.v4();

  await db.transaction(
    async (trx: Knex.Transaction): Promise<void> => {
      try {
        await findAndDuplicateLayout({
          currentLayoutId: d1,
          newCreatorId: userId,
          newNodeId: nodeId,
          trx
        });
        t.fail('Should not get here.');
      } catch (error) {
        t.equal(error.message, `Layout attribute ${d1} not found.`);
      }
    }
  );
});

test('findAndDuplicateLayout() standard case', async (t: Test) => {
  const findStub = sandbox().spy(LayoutsDAO, 'findById');
  const { user: newUser } = await createUser({ withSession: false });
  const d1 = uuid.v4();
  const n2 = uuid.v4();

  await db.transaction(
    async (trx: Knex.Transaction): Promise<void> => {
      await generateNode({ id: n2 }, trx);
      const { layout } = await generateLayoutAttribute({ id: d1 }, trx);

      const result = await findAndDuplicateLayout({
        currentLayoutId: d1,
        newCreatorId: newUser.id,
        newNodeId: n2,
        trx
      });

      t.notEqual(result.id, layout.id);
      t.notEqual(result.createdAt, layout.createdAt);
      t.deepEqual(
        omit(result, 'id', 'createdAt'),
        omit(
          {
            ...layout,
            nodeId: n2,
            createdBy: newUser.id
          },
          'id',
          'createdAt'
        )
      );

      t.equal(findStub.callCount, 1, 'findById is called once.');
    }
  );
});

test('findAndDuplicateLayout() with a layout object passed in', async (t: Test) => {
  const findStub = sandbox().spy(LayoutsDAO, 'findById');
  const { user: newUser } = await createUser({ withSession: false });
  const d1 = uuid.v4();
  const n2 = uuid.v4();

  await db.transaction(
    async (trx: Knex.Transaction): Promise<void> => {
      await generateNode({ id: n2 }, trx);
      const { layout } = await generateLayoutAttribute({ id: d1 }, trx);

      const result = await findAndDuplicateLayout({
        currentLayout: layout,
        currentLayoutId: d1,
        newCreatorId: newUser.id,
        newNodeId: n2,
        trx
      });

      t.notEqual(result.id, layout.id);
      t.notEqual(result.createdAt, layout.createdAt);
      t.deepEqual(
        omit(result, 'id', 'createdAt'),
        omit(
          {
            ...layout,
            nodeId: n2,
            createdBy: newUser.id
          },
          'id',
          'createdAt'
        )
      );

      t.equal(findStub.callCount, 0, 'findById is never called.');
    }
  );
});
