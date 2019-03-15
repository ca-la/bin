import { test, Test } from '../../test-helpers/fresh';
import createUser = require('../../test-helpers/create-user');
import parseCommentText from '.';
import generateCollaborator from '../../test-helpers/factories/collaborator';
import getCollaboratorName from '../get-collaborator-name';
import generateCollection from '../../test-helpers/factories/collection';
import { MentionType } from '@cala/ts-lib';

test('parseCommentText adds replaces mentions with names', async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  const { collection } = await generateCollection();
  const { collaborator } = await generateCollaborator({
    collectionId: collection.id,
    userId: user.id
  });

  const noMentionText = 'hello there';
  const noMentionResult = await parseCommentText(noMentionText);
  t.deepEqual(noMentionResult, 'hello there', 'comment no mentions is parsed');

  const oneMentionText = `hello @<${collaborator.id}|${MentionType.collaborator}> there`;
  const oneMentionResult = await parseCommentText(oneMentionText);
  t.deepEqual(oneMentionResult,
    `hello @${getCollaboratorName(collaborator)} there`,
    'comment with single mention is parsed'
  );

  const multiMentionText = `hello @<${collaborator.id}|${MentionType.collaborator}> there
  what is up @<${collaborator.id}|${MentionType.collaborator}>?
  `;
  const multiMentionResult = await parseCommentText(multiMentionText);
  t.deepEqual(multiMentionResult,
    `hello @${getCollaboratorName(collaborator)} there
  what is up @${getCollaboratorName(collaborator)}?
  `,
    'comment with multiple mentions is parsed'
  );
});
