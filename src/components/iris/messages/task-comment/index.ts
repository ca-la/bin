import { RealtimeTaskComment, RealtimeTaskCommentDeletion } from '@cala/ts-lib';
import { sendMessage } from '../../send-message';
import Comment from '../../../comments/domain-object';
import TaskComment from '../../../../domain-objects/task-comment';
import addAtMentionDetails from '../../../../services/add-at-mention-details';

/**
 * Publishes a task comment to the Iris SQS.
 */
export async function announceTaskCommentCreation(
  taskComment: TaskComment,
  comment: Comment
): Promise<RealtimeTaskComment> {
  const commentWithMentions = await addAtMentionDetails([comment]);

  const realtimeTaskComment: RealtimeTaskComment = {
    actorId: comment.userId,
    resource: commentWithMentions[0],
    taskId: taskComment.taskId,
    type: 'task-comment'
  };
  await sendMessage(realtimeTaskComment);
  return realtimeTaskComment;
}

/**
 * Publishes a task comment deletion to the Iris SQS.
 */
export async function announceTaskCommentDeletion(options: {
  actorId: string,
  commentId: string,
  taskId: string
}): Promise<RealtimeTaskCommentDeletion> {
  const { actorId, commentId, taskId } = options;

  const realtimeTaskCommentDeletion: RealtimeTaskCommentDeletion = {
    actorId,
    resource: { id: commentId },
    taskId,
    type: 'task-comment/delete'
  };
  await sendMessage(realtimeTaskCommentDeletion);
  return realtimeTaskCommentDeletion;
}
