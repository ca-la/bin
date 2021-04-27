import {
  RealtimeAnnotationComment,
  RealtimeAnnotationCommentDeletion,
} from "@cala/ts-lib";

import { sendMessage } from "../../send-message";
import AnnotationComment from "../../../annotation-comments/domain-object";
import { CommentWithResources } from "../../../comments/types";

/**
 * Publishes an annotation comment to the Iris SQS.
 */
export async function announceAnnotationCommentCreation(
  annotationComment: AnnotationComment,
  comment: CommentWithResources
): Promise<RealtimeAnnotationComment> {
  const realtimeAnnotationComment: RealtimeAnnotationComment = {
    actorId: comment.userId,
    annotationId: annotationComment.annotationId,
    resource: comment,
    type: "annotation-comment",
  };
  await sendMessage(realtimeAnnotationComment);
  return realtimeAnnotationComment;
}

/**
 * Publishes an annotation comment deletion to the Iris SQS.
 */
export async function announceAnnotationCommentDeletion(options: {
  actorId: string;
  annotationId: string;
  commentId: string;
}): Promise<RealtimeAnnotationCommentDeletion> {
  const { actorId, annotationId, commentId } = options;

  const realtimeAnnotationCommentDeletion: RealtimeAnnotationCommentDeletion = {
    actorId,
    annotationId,
    resource: { id: commentId },
    type: "annotation-comment/delete",
  };
  await sendMessage(realtimeAnnotationCommentDeletion);
  return realtimeAnnotationCommentDeletion;
}
