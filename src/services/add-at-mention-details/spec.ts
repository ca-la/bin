import * as tape from 'tape';
import * as uuid from 'node-uuid';

import { test } from '../../test-helpers/fresh';
import { create } from '../../components/comments/dao';
import createUser = require('../../test-helpers/create-user');
import addAtMentionDetails from '.';
import generateCollaborator from '../../test-helpers/factories/collaborator';
import generateCollection from '../../test-helpers/factories/collection';
import * as CollaboratorsDAO from '../../components/collaborators/dao';

test('addAtMentionDetails adds null when there are no at mentions', async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });

  const comment = await create({
    createdAt: new Date(),
    deletedAt: null,
    id: uuid.v4(),
    isPinned: false,
    parentCommentId: null,
    text: 'A comment with no mentions',
    userId: user.id
  });

  const result = await addAtMentionDetails([comment]);
  t.deepEqual(result[0].mentions, {}, 'comments mentions are null');
});

test('addAtMentionDetails adds details when there is an at mention', async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });

  const { collection } = await generateCollection();
  const { collaborator } = await generateCollaborator({
    collectionId: collection.id,
    userId: user.id
  });

  const comment = await create({
    createdAt: new Date(),
    deletedAt: null,
    id: uuid.v4(),
    isPinned: false,
    parentCommentId: null,
    text: `A comment @<${collaborator.id}|collaborator> with mentions`,
    userId: user.id
  });

  const result = await addAtMentionDetails([comment]);
  const { mentions } = result[0];

  t.deepEqual(
    mentions[collaborator.id],
    user.name,
    'comments mention has correct name as value'
  );
});

test('addAtMentionDetails adds details when there is an at mention even for a removed collaborator', async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });

  const { collection } = await generateCollection();
  const { collaborator } = await generateCollaborator({
    collectionId: collection.id,
    userId: user.id
  });
  await CollaboratorsDAO.deleteById(collaborator.id);

  const comment = await create({
    createdAt: new Date(),
    deletedAt: null,
    id: uuid.v4(),
    isPinned: false,
    parentCommentId: null,
    text: `A comment @<${collaborator.id}|collaborator> with mentions`,
    userId: user.id
  });

  const result = await addAtMentionDetails([comment]);
  const { mentions } = result[0];

  t.deepEqual(
    mentions[collaborator.id],
    `${user.name} (Removed)`,
    'comments mention has correct name as value'
  );
});

test('addAtMentionDetails can add details when there is an at mention for an unknown collaborator', async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });
  const randomId = uuid.v4();

  const comment = await create({
    createdAt: new Date(),
    deletedAt: null,
    id: uuid.v4(),
    isPinned: false,
    parentCommentId: null,
    text: `A comment @<${randomId}|collaborator> with mentions`,
    userId: user.id
  });

  const result = await addAtMentionDetails([comment]);
  const { mentions } = result[0];

  t.deepEqual(
    mentions[randomId],
    'Unknown',
    'comments mention has correct name as value'
  );
});

test('addAtMentionDetails adds details for multiple at mentions', async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });
  const { user: u2 } = await createUser({ withSession: false });
  const { collection } = await generateCollection();

  const { collaborator } = await generateCollaborator({
    collectionId: collection.id,
    userId: user.id
  });
  const { collaborator: c2 } = await generateCollaborator({
    collectionId: collection.id,
    userId: u2.id
  });

  const comment = await create({
    createdAt: new Date(),
    deletedAt: null,
    id: uuid.v4(),
    isPinned: false,
    parentCommentId: null,
    text: `A comment @<${collaborator.id}|collaborator> with mentions @<${
      c2.id
    }|collaborator>`,
    userId: user.id
  });

  const result = await addAtMentionDetails([comment]);
  const { mentions } = result[0];

  t.deepEqual(
    mentions[collaborator.id],
    user.name,
    'comments mention 1 has correct name as value'
  );
  t.deepEqual(
    mentions[c2.id],
    u2.name,
    'comments mention 2 has correct name as value'
  );
});

test('addAtMentionDetails adds single detail for multiple at mentions of single user', async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });
  const { collection } = await generateCollection();

  const { collaborator: c1 } = await generateCollaborator({
    collectionId: collection.id,
    userId: user.id
  });

  const comment = await create({
    createdAt: new Date(),
    deletedAt: null,
    id: uuid.v4(),
    isPinned: false,
    parentCommentId: null,
    text: `A comment @<${c1.id}|collaborator> with mentions @<${
      c1.id
    }|collaborator>`,
    userId: user.id
  });

  const result = await addAtMentionDetails([comment]);
  const { mentions } = result[0];

  t.deepEqual(
    mentions[c1.id],
    user.name,
    'comments mention 1 has correct name as value'
  );
  t.deepEqual(
    Object.keys(mentions).length,
    1,
    'comments mentions has only 1 value'
  );
});
