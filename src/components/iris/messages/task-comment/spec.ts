import * as tape from 'tape';

import * as SendMessageService from '../../send-message';
import * as MentionDetailsService from '../../../../services/add-at-mention-details';
import { sandbox, test } from '../../../../test-helpers/fresh';
import { announceTaskCommentCreation } from './index';
import TaskComment from '../../../../domain-objects/task-comment';
import generateComment from '../../../../test-helpers/factories/comment';

test('announceTaskCommentCreation supports sending a message', async (t: tape.Test) => {
  const sendStub = sandbox().stub(SendMessageService, 'sendMessage').resolves({});
  const { comment } = await generateComment();
  const tcOne: TaskComment =  {
    commentId: comment.id,
    taskId: 'task-one'
  };
  const mentionStub = sandbox().stub(MentionDetailsService, 'default').resolves([{
    ...comment,
    mentions: {}
  }]);

  const response = await announceTaskCommentCreation(tcOne, comment);
  t.deepEqual(response, {
    actorId: comment.userId,
    resource: { ...comment, mentions: {} },
    taskId: 'task-one',
    type: 'task-comment'
  }, 'Returns the realtime message that was sent');
  t.true(sendStub.calledOnce);
  t.true(mentionStub.calledOnce);
});
