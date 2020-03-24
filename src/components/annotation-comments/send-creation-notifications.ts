import * as Knex from 'knex';
import * as AnnotationsDAO from '../../components/product-design-canvas-annotations/dao';
import * as CollaboratorsDAO from '../../components/collaborators/dao';
import * as CommentsDAO from '../../components/comments/dao';
import * as CanvasesDAO from '../../components/canvases/dao';
import * as NotificationsService from '../../services/create-notifications';
import Comment from '../comments/domain-object';
import parseAtMentions, {
  MentionType
} from '@cala/ts-lib/dist/parsing/comment-mentions';
import { CollaboratorWithUser } from '../collaborators/domain-objects/collaborator';

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

  const mentions = parseAtMentions(comment.text);
  const mentionedUserIds: string[] = [];
  for (const mention of mentions) {
    if (mention.type !== MentionType.collaborator) {
      continue;
    }

    const collaborator: CollaboratorWithUser | null = await CollaboratorsDAO.findById(
      mention.id,
      false,
      trx
    );

    if (!collaborator) {
      throw new Error(`Cannot find mentioned collaborator ${mention.id}`);
    }

    if (!collaborator.user) {
      continue;
    }

    await NotificationsService.sendAnnotationCommentMentionNotification(
      annotationId,
      annotation.canvasId,
      comment.id,
      actorUserId,
      collaborator.user.id,
      trx
    );
    mentionedUserIds.push(collaborator.user.id);
  }

  const threadUserIds: string[] = [];
  if (comment.parentCommentId && mentions.length === 0) {
    const parentComment = await CommentsDAO.findById(comment.parentCommentId);
    if (!parentComment) {
      throw new Error(
        `Could not find parent comment for comment reply ${comment.id}`
      );
    }
    const canvas = await CanvasesDAO.findById(annotation.canvasId);
    if (!canvas) {
      throw new Error(`Canvas ${annotation.canvasId} does not exist!`);
    }

    // Notify the parent of the comment
    await NotificationsService.sendAnnotationCommentReplyNotification(
      trx,
      annotationId,
      canvas.id,
      canvas.designId,
      comment.id,
      actorUserId,
      parentComment.userId
    );
    threadUserIds.push(parentComment.userId);

    // Notify the participants in the comment thread
    const comments = await CommentsDAO.findByParentId(trx, parentComment.id);
    for (const threadComment of comments) {
      if (!threadUserIds.includes(threadComment.userId)) {
        const collaborators: CollaboratorWithUser[] = await CollaboratorsDAO.findAllForUserThroughDesign(
          canvas.designId,
          threadComment.userId,
          trx
        );
        if (collaborators.length === 0) {
          continue;
        }

        threadUserIds.push(threadComment.userId);

        await NotificationsService.sendAnnotationCommentReplyNotification(
          trx,
          annotationId,
          canvas.id,
          canvas.designId,
          comment.id,
          actorUserId,
          threadComment.userId
        );
      }
    }
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
