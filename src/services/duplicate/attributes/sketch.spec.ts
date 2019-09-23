import * as Knex from 'knex';
import * as uuid from 'node-uuid';
import { omit } from 'lodash';

import { sandbox, test, Test } from '../../../test-helpers/fresh';
import * as db from '../../../services/db';
import findAndDuplicateSketch from './sketch';
import generateSketchAttribute from '../../../test-helpers/factories/sketch-attribute';
import createUser = require('../../../test-helpers/create-user');
import generateNode from '../../../test-helpers/factories/node';
import * as SketchesDAO from '../../../components/attributes/sketch-attributes/dao';

test('findAndDuplicateSketch() failure case', async (t: Test) => {
  const s1 = uuid.v4();
  const userId = uuid.v4();
  const nodeId = uuid.v4();

  await db.transaction(
    async (trx: Knex.Transaction): Promise<void> => {
      try {
        await findAndDuplicateSketch({
          currentSketchId: s1,
          newCreatorId: userId,
          newNodeId: nodeId,
          trx
        });
        t.fail('Should not get here.');
      } catch (error) {
        t.equal(error.message, `Sketch attribute ${s1} not found.`);
      }
    }
  );
});

test('findAndDuplicateSketch() standard case', async (t: Test) => {
  const findStub = sandbox().spy(SketchesDAO, 'findById');
  const { user: newUser } = await createUser({ withSession: false });
  const s1 = uuid.v4();
  const n2 = uuid.v4();

  await db.transaction(
    async (trx: Knex.Transaction): Promise<void> => {
      await generateNode({ id: n2 }, trx);
      const { sketch } = await generateSketchAttribute({ id: s1 }, trx);

      const result = await findAndDuplicateSketch({
        currentSketchId: s1,
        newCreatorId: newUser.id,
        newNodeId: n2,
        trx
      });

      t.notEqual(result.id, sketch.id);
      t.notEqual(result.createdAt, sketch.createdAt);
      t.deepEqual(
        omit(result, 'id', 'createdAt'),
        omit(
          {
            ...sketch,
            nodeId: n2,
            createdBy: newUser.id
          },
          'id',
          'createdAt'
        )
      );

      t.equal(findStub.callCount, 1, 'The findById function is called once.');
    }
  );
});

test('findAndDuplicateSketch() with a sketch object passed in', async (t: Test) => {
  const findStub = sandbox().spy(SketchesDAO, 'findById');
  const { user: newUser } = await createUser({ withSession: false });
  const s1 = uuid.v4();
  const n2 = uuid.v4();

  await db.transaction(
    async (trx: Knex.Transaction): Promise<void> => {
      await generateNode({ id: n2 }, trx);
      const { sketch } = await generateSketchAttribute({ id: s1 }, trx);

      const result = await findAndDuplicateSketch({
        currentSketch: sketch,
        currentSketchId: s1,
        newCreatorId: newUser.id,
        newNodeId: n2,
        trx
      });

      t.notEqual(result.id, sketch.id);
      t.notEqual(result.createdAt, sketch.createdAt);
      t.deepEqual(
        omit(result, 'id', 'createdAt'),
        omit(
          {
            ...sketch,
            nodeId: n2,
            createdBy: newUser.id
          },
          'id',
          'createdAt'
        )
      );

      t.equal(findStub.callCount, 0, 'The findById function is never called.');
    }
  );
});
