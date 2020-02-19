import tape from 'tape';
import uuid from 'node-uuid';
import Knex from 'knex';

import { test } from '../../test-helpers/fresh';
import { create, deleteById, findById, update } from './dao';
import createUser from '../../test-helpers/create-user';
import generateAsset from '../../test-helpers/factories/asset';
import * as CommentAttachmentDAO from '../comment-attachments/dao';
import db from '../../services/db';

test('Comment DAO supports creation/retrieval', async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });

  const comment = await create({
    createdAt: new Date(),
    deletedAt: null,
    id: uuid.v4(),
    isPinned: false,
    parentCommentId: null,
    text: 'A comment',
    userId: user.id
  });

  const result = await findById(comment.id);
  t.deepEqual(result, comment, 'Inserted comment matches found');
});

test('Comment DAO supports retrieval with attachments', async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });

  const comment = await create({
    createdAt: new Date(),
    deletedAt: null,
    id: uuid.v4(),
    isPinned: false,
    parentCommentId: null,
    text: 'A comment',
    userId: user.id
  });

  const asset1 = (await generateAsset()).asset;
  const asset2 = (await generateAsset()).asset;
  await db.transaction(async (trx: Knex.Transaction) => {
    await CommentAttachmentDAO.createAll(trx, [
      {
        assetId: asset1.id,
        commentId: comment.id
      },
      {
        assetId: asset2.id,
        commentId: comment.id
      }
    ]);
  });

  const result = await findById(comment.id);
  if (result === null) {
    return t.fail('No comments were returned');
  }
  t.assert(result.attachments.length === 2, 'Returns attachments');
});

test('Comment DAO supports update', async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });

  const comment = await create({
    createdAt: new Date(),
    deletedAt: null,
    id: uuid.v4(),
    isPinned: false,
    parentCommentId: null,
    text: 'A comment',
    userId: user.id
  });
  const updated = await update({
    ...comment,
    text: 'Updated'
  });

  const result = await findById(comment.id);
  t.deepEqual(result, updated, 'Updated comment matches found');
});

test('Comment DAO supports delete', async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });

  const comment = await create({
    createdAt: new Date(),
    deletedAt: null,
    id: uuid.v4(),
    isPinned: false,
    parentCommentId: null,
    text: 'A comment',
    userId: user.id
  });
  await deleteById(comment.id);

  const result = await findById(comment.id);
  t.equal(result, null, 'Removes comment');
});
