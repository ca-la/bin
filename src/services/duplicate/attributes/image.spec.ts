import Knex from 'knex';
import uuid from 'node-uuid';
import { omit } from 'lodash';

import { sandbox, test, Test } from '../../../test-helpers/fresh';
import db from '../../db';
import findAndDuplicateImage from './image';
import generateImageAttribute from '../../../test-helpers/factories/image-attribute';
import createUser = require('../../../test-helpers/create-user');
import generateNode from '../../../test-helpers/factories/node';
import * as ImagesDAO from '../../../components/attributes/image-attributes/dao';

test('findAndDuplicateImage() failure case', async (t: Test) => {
  const s1 = uuid.v4();
  const userId = uuid.v4();
  const nodeId = uuid.v4();

  await db.transaction(
    async (trx: Knex.Transaction): Promise<void> => {
      try {
        await findAndDuplicateImage({
          currentImageId: s1,
          newCreatorId: userId,
          newNodeId: nodeId,
          trx
        });
        t.fail('Should not get here.');
      } catch (error) {
        t.equal(error.message, `Image attribute ${s1} not found.`);
      }
    }
  );
});

test('findAndDuplicateImage() standard case', async (t: Test) => {
  const findStub = sandbox().spy(ImagesDAO, 'findById');
  const { user: newUser } = await createUser({ withSession: false });
  const s1 = uuid.v4();
  const n2 = uuid.v4();

  await db.transaction(
    async (trx: Knex.Transaction): Promise<void> => {
      await generateNode({ id: n2 }, trx);
      const { image } = await generateImageAttribute({ id: s1 }, trx);

      const result = await findAndDuplicateImage({
        currentImageId: s1,
        newCreatorId: newUser.id,
        newNodeId: n2,
        trx
      });

      t.notEqual(result.id, image.id);
      t.notEqual(result.createdAt, image.createdAt);
      t.deepEqual(
        omit(result, 'id', 'createdAt'),
        omit(
          {
            ...image,
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

test('findAndDuplicateImage() with a image object passed in', async (t: Test) => {
  const findStub = sandbox().spy(ImagesDAO, 'findById');
  const { user: newUser } = await createUser({ withSession: false });
  const s1 = uuid.v4();
  const n2 = uuid.v4();

  await db.transaction(
    async (trx: Knex.Transaction): Promise<void> => {
      await generateNode({ id: n2 }, trx);
      const { image } = await generateImageAttribute({ id: s1 }, trx);

      const result = await findAndDuplicateImage({
        currentImage: image,
        currentImageId: s1,
        newCreatorId: newUser.id,
        newNodeId: n2,
        trx
      });

      t.notEqual(result.id, image.id);
      t.notEqual(result.createdAt, image.createdAt);
      t.deepEqual(
        omit(result, 'id', 'createdAt'),
        omit(
          {
            ...image,
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
