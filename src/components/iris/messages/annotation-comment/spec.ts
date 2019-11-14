import tape from 'tape';

import * as SendMessageService from '../../send-message';
import * as MentionDetailsService from '../../../../services/add-at-mention-details';
import { sandbox, test } from '../../../../test-helpers/fresh';
import { announceAnnotationCommentCreation } from './index';
import AnnotationComment from '../../../annotation-comments/domain-object';
import generateComment from '../../../../test-helpers/factories/comment';

test('announceAnnotationCommentCreation supports sending a message', async (t: tape.Test) => {
  const sendStub = sandbox()
    .stub(SendMessageService, 'sendMessage')
    .resolves({});
  const { comment } = await generateComment();
  const acOne: AnnotationComment = {
    annotationId: 'annotation-one',
    commentId: comment.id
  };
  const mentionStub = sandbox()
    .stub(MentionDetailsService, 'default')
    .resolves([
      {
        ...comment,
        mentions: {}
      }
    ]);

  const response = await announceAnnotationCommentCreation(acOne, comment);
  t.deepEqual(
    response,
    {
      actorId: comment.userId,
      annotationId: 'annotation-one',
      resource: { ...comment, mentions: {} },
      type: 'annotation-comment'
    },
    'Returns the realtime message that was sent'
  );
  t.true(sendStub.calledOnce);
  t.true(mentionStub.calledOnce);
});
