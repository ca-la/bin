import * as Knex from 'knex';
import * as uuid from 'node-uuid';
import { omit } from 'lodash';

import { sandbox, test, Test } from '../../../test-helpers/fresh';
import * as db from '../../../services/db';
import findAndDuplicateDimension from './dimension';
import generateDimensionAttribute from '../../../test-helpers/factories/dimension-attribute';
import createUser = require('../../../test-helpers/create-user');
import generateNode from '../../../test-helpers/factories/node';
import * as DimensionsDAO from '../../../components/attributes/dimension-attributes/dao';

test('findAndDuplicateDimension() failure case', async (t: Test) => {
  const d1 = uuid.v4();
  const userId = uuid.v4();
  const nodeId = uuid.v4();

  await db.transaction(
    async (trx: Knex.Transaction): Promise<void> => {
      try {
        await findAndDuplicateDimension({
          currentDimensionId: d1,
          newCreatorId: userId,
          newNodeId: nodeId,
          trx
        });
        t.fail('Should not get here.');
      } catch (error) {
        t.equal(error.message, `Dimension attribute ${d1} not found.`);
      }
    }
  );
});

test('findAndDuplicateDimension() standard case', async (t: Test) => {
  const findStub = sandbox().spy(DimensionsDAO, 'findById');
  const { user: newUser } = await createUser({ withSession: false });
  const d1 = uuid.v4();
  const n2 = uuid.v4();

  await db.transaction(
    async (trx: Knex.Transaction): Promise<void> => {
      await generateNode({ id: n2 }, trx);
      const { dimension } = await generateDimensionAttribute({ id: d1 }, trx);

      const result = await findAndDuplicateDimension({
        currentDimensionId: d1,
        newCreatorId: newUser.id,
        newNodeId: n2,
        trx
      });

      t.notEqual(result.id, dimension.id);
      t.notEqual(result.createdAt, dimension.createdAt);
      t.deepEqual(
        omit(result, 'id', 'createdAt'),
        omit(
          {
            ...dimension,
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

test('findAndDuplicateDimension() with a dimension object passed in', async (t: Test) => {
  const findStub = sandbox().spy(DimensionsDAO, 'findById');
  const { user: newUser } = await createUser({ withSession: false });
  const d1 = uuid.v4();
  const n2 = uuid.v4();

  await db.transaction(
    async (trx: Knex.Transaction): Promise<void> => {
      await generateNode({ id: n2 }, trx);
      const { dimension } = await generateDimensionAttribute({ id: d1 }, trx);

      const result = await findAndDuplicateDimension({
        currentDimension: dimension,
        currentDimensionId: d1,
        newCreatorId: newUser.id,
        newNodeId: n2,
        trx
      });

      t.notEqual(result.id, dimension.id);
      t.notEqual(result.createdAt, dimension.createdAt);
      t.deepEqual(
        omit(result, 'id', 'createdAt'),
        omit(
          {
            ...dimension,
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
