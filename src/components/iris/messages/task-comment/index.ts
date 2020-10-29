import { RealtimeTaskComment, RealtimeTaskCommentDeletion } from "@cala/ts-lib";
import Knex from "knex";

import { sendMessage } from "../../send-message";
import TaskComment from "../../../task-comments/domain-object";
import addAtMentionDetails from "../../../../services/add-at-mention-details";
import { CommentWithAttachmentLinks } from "../../../../services/add-attachments-links";

/**
 * Publishes a task comment to the Iris SQS.
 */
export async function announceTaskCommentCreation(
  trx: Knex.Transaction,
  taskComment: TaskComment,
  comment: CommentWithAttachmentLinks
): Promise<RealtimeTaskComment> {
  const commentWithMentions = await addAtMentionDetails(trx, [comment]);

  const realtimeTaskComment: RealtimeTaskComment = {
    actorId: comment.userId,
    resource: commentWithMentions[0],
    taskId: taskComment.taskId,
    type: "task-comment",
  };
  await sendMessage(realtimeTaskComment);
  return realtimeTaskComment;
}

/**
 * Publishes a task comment deletion to the Iris SQS.
 */
export async function announceTaskCommentDeletion(options: {
  actorId: string;
  commentId: string;
  taskId: string;
}): Promise<RealtimeTaskCommentDeletion> {
  const { actorId, commentId, taskId } = options;

  const realtimeTaskCommentDeletion: RealtimeTaskCommentDeletion = {
    actorId,
    resource: { id: commentId },
    taskId,
    type: "task-comment/delete",
  };
  await sendMessage(realtimeTaskCommentDeletion);
  return realtimeTaskCommentDeletion;
}
