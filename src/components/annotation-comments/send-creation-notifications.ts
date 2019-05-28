import * as AnnotationsDAO from '../../components/product-design-canvas-annotations/dao';
import * as CollaboratorsDAO from '../../components/collaborators/dao';
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
      return;
    }

    const collaborator: CollaboratorWithUser | null = await CollaboratorsDAO.findById(
      mention.id
    );

    if (!collaborator) {
      throw new Error(`Cannot find mentioned collaborator ${mention.id}`);
    }

    if (!collaborator.user) {
      return;
    }

    await NotificationsService.sendAnnotationCommentMentionNotification(
      annotationId,
      annotation.canvasId,
      comment.id,
      actorUserId,
      collaborator.user.id
    );
    mentionedUserIds.push(collaborator.user.id);
  }

  await NotificationsService.sendDesignOwnerAnnotationCommentCreateNotification(
    annotationId,
    annotation.canvasId,
    comment.id,
    actorUserId,
    mentionedUserIds
  );
}
