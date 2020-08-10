import * as Knex from "knex";

import * as AnnotationsDAO from "../../components/product-design-canvas-annotations/dao";
import * as CanvasesDAO from "../../components/canvases/dao";
import * as NotificationsService from "../../services/create-notifications";
import Comment from "../comments/types";
import {
  getCollaboratorsFromCommentMentions,
  getThreadUserIdsFromCommentThread,
} from "../../services/add-at-mention-details";

interface Options {
  comment: Comment;
  annotationId: string;
  actorUserId: string;
}

export default async function sendCreationNotifications(
  trx: Knex.Transaction,
  options: Options
): Promise<void> {
  const { comment, annotationId, actorUserId } = options;

  const annotation = await AnnotationsDAO.findById(annotationId);
  if (!annotation) {
    throw new Error(
      `Could not find matching annotation for comment ${comment.id}`
    );
  }

  const { mentionedUserIds } = await getCollaboratorsFromCommentMentions(
    trx,
    comment.text
  );
  for (const mentionedUserId of mentionedUserIds) {
    await NotificationsService.sendAnnotationCommentMentionNotification(
      annotationId,
      annotation.canvasId,
      comment.id,
      actorUserId,
      mentionedUserId,
      trx
    );
  }

  const threadUserIds: string[] =
    comment.parentCommentId && mentionedUserIds.length === 0
      ? await getThreadUserIdsFromCommentThread(trx, comment.parentCommentId)
      : [];

  const canvas = await CanvasesDAO.findById(annotation.canvasId);
  if (!canvas) {
    throw new Error(`Canvas ${annotation.canvasId} does not exist!`);
  }

  for (const threadUserId of threadUserIds) {
    await NotificationsService.sendAnnotationCommentReplyNotification(
      trx,
      annotationId,
      canvas.id,
      canvas.designId,
      comment.id,
      actorUserId,
      threadUserId
    );
  }

  await NotificationsService.sendDesignOwnerAnnotationCommentCreateNotification(
    annotationId,
    annotation.canvasId,
    comment.id,
    actorUserId,
    mentionedUserIds,
    threadUserIds,
    trx
  );
}
