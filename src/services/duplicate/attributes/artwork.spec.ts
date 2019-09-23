import * as Knex from 'knex';
import * as uuid from 'node-uuid';
import { omit } from 'lodash';

import { sandbox, test, Test } from '../../../test-helpers/fresh';
import * as db from '../../../services/db';
import findAndDuplicateArtwork from './artwork';
import generateArtworkAttribute from '../../../test-helpers/factories/artwork-attribute';
import createUser = require('../../../test-helpers/create-user');
import generateNode from '../../../test-helpers/factories/node';
import * as ArtworksDAO from '../../../components/attributes/artwork-attributes/dao';

test('findAndDuplicateArtwork() failure case', async (t: Test) => {
  const a1 = uuid.v4();
  const userId = uuid.v4();
  const nodeId = uuid.v4();

  await db.transaction(
    async (trx: Knex.Transaction): Promise<void> => {
      try {
        await findAndDuplicateArtwork({
          currentArtworkId: a1,
          newCreatorId: userId,
          newNodeId: nodeId,
          trx
        });
        t.fail('Should not get here.');
      } catch (error) {
        t.equal(error.message, `Artwork attribute ${a1} not found.`);
      }
    }
  );
});

test('findAndDuplicateArtwork() standard case', async (t: Test) => {
  const findStub = sandbox().spy(ArtworksDAO, 'findById');
  const { user: newUser } = await createUser({ withSession: false });
  const a1 = uuid.v4();
  const n2 = uuid.v4();

  await db.transaction(
    async (trx: Knex.Transaction): Promise<void> => {
      await generateNode({ id: n2 }, trx);
      const { artwork } = await generateArtworkAttribute({ id: a1 }, trx);

      const result = await findAndDuplicateArtwork({
        currentArtworkId: a1,
        newCreatorId: newUser.id,
        newNodeId: n2,
        trx
      });

      t.notEqual(result.id, artwork.id);
      t.notEqual(result.createdAt, artwork.createdAt);
      t.deepEqual(
        omit(result, 'id', 'createdAt'),
        omit(
          {
            ...artwork,
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

test('findAndDuplicateArtwork() with an artwork object passed in', async (t: Test) => {
  const findStub = sandbox().spy(ArtworksDAO, 'findById');
  const { user: newUser } = await createUser({ withSession: false });
  const a1 = uuid.v4();
  const n2 = uuid.v4();

  await db.transaction(
    async (trx: Knex.Transaction): Promise<void> => {
      await generateNode({ id: n2 }, trx);
      const { artwork } = await generateArtworkAttribute({ id: a1 }, trx);

      const result = await findAndDuplicateArtwork({
        currentArtwork: artwork,
        currentArtworkId: a1,
        newCreatorId: newUser.id,
        newNodeId: n2,
        trx
      });

      t.notEqual(result.id, artwork.id);
      t.notEqual(result.createdAt, artwork.createdAt);
      t.deepEqual(
        omit(result, 'id', 'createdAt'),
        omit(
          {
            ...artwork,
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
