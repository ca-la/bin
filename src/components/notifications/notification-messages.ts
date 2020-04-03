import { escape as escapeOptionalHtml } from 'lodash';
import {
  BreadCrumb,
  NotificationMessage,
  NotificationMessageActionType
} from '@cala/ts-lib';

import InvalidDataError from '../../errors/invalid-data';
import * as CollaboratorsDAO from '../collaborators/dao';
import * as CommentsDAO from '../../components/comments/dao';
import {
  DEPRECATED_NOTIFICATION_TYPES,
  FullNotification,
  NotificationType
} from './domain-object';
import getLinks, { constructHtmlLink, LinkType } from './get-links';
import normalizeTitle from '../../services/normalize-title';
import Comment from '../../components/comments/domain-object';
import { ComponentType } from '../components/domain-object';
import { getMentionsFromComment } from '../../services/add-at-mention-details';
import { generatePreviewLinks } from '../../services/attach-asset-links';

function span(text: string, className?: string): string {
  return `<span class='${className}'>${text}</span>`;
}

function buildImageUrl(imageIds: string[]): string | null {
  const imageLinks = generatePreviewLinks(imageIds);

  return imageLinks.length > 0 ? imageLinks[0].thumbnailLink : null;
}

function escapeHtml(html?: string | null): string {
  return escapeOptionalHtml(html || '');
}

function getLocation({
  collection,
  design
}: {
  collection: { title: string | null; id: string } | null;
  design: { title: string | null; id: string } | null;
}): BreadCrumb[] {
  const location = [];
  if (collection) {
    const { deepLink: collectionLink } = getLinks({
      collection,
      type: LinkType.Collection
    });
    location.push({ text: normalizeTitle(collection), url: collectionLink });
  }
  if (design) {
    const { deepLink: designLink } = getLinks({
      design,
      type: LinkType.Design
    });
    location.push({ text: normalizeTitle(design), url: designLink });
  }
  return location;
}

export async function createNotificationMessage(
  notification: FullNotification
): Promise<NotificationMessage | null> {
  if (DEPRECATED_NOTIFICATION_TYPES.includes(notification.type)) {
    return null;
  }

  const baseNotificationMessage = {
    actions: [],
    actor: notification.actor,
    attachments: [],
    createdAt: notification.createdAt,
    id: notification.id,
    readAt: notification.readAt
  };

  switch (notification.type) {
    case NotificationType.INVITE_COLLABORATOR: {
      if (!notification.collectionId && !notification.designId) {
        return null;
      }
      const designMeta = notification.designId
        ? { title: notification.designTitle, id: notification.designId }
        : null;
      const collectionMeta = notification.collectionId
        ? {
            title: notification.collectionTitle,
            id: notification.collectionId
          }
        : null;
      const resourceName = normalizeTitle({
        title: notification.designTitle || notification.collectionTitle
      });
      const cleanName = escapeHtml(notification.actor.name);
      const partialMessage = {
        ...baseNotificationMessage,
        imageUrl: buildImageUrl(notification.designImageIds),
        location: getLocation({
          collection: collectionMeta,
          design: designMeta
        }),
        title: `${cleanName} invited you to collaborate on ${resourceName}`
      };

      if (collectionMeta) {
        const { htmlLink, deepLink } = getLinks({
          collection: collectionMeta,
          type: LinkType.Collection
        });

        return {
          ...partialMessage,
          html: `${span(
            cleanName,
            'user-name'
          )} invited you to collaborate on ${htmlLink}`,
          link: deepLink
        };
      }

      if (designMeta) {
        const { htmlLink, deepLink } = getLinks({
          design: designMeta,
          type: LinkType.Design
        });

        return {
          ...partialMessage,
          html: `${span(
            cleanName,
            'user-name'
          )} invited you to collaborate on ${htmlLink}`,
          link: deepLink
        };
      }

      return null;
    }

    case NotificationType.ANNOTATION_COMMENT_CREATE: {
      const {
        annotationId,
        annotationImageId,
        canvasId,
        designId,
        collectionId,
        commentId,
        commentText,
        hasAttachments,
        componentType
      } = notification;
      const design = { id: designId, title: notification.designTitle };
      const collaborators = await CollaboratorsDAO.findByDesign(designId);
      const collection = collectionId
        ? { id: collectionId, title: notification.collectionTitle }
        : null;
      const mentions = await getMentionsFromComment(commentText);
      const cleanName = escapeHtml(baseNotificationMessage.actor.name);
      const { deepLink, htmlLink } = getLinks({
        annotationId,
        canvasId,
        componentType: componentType as ComponentType,
        design,
        type: LinkType.DesignAnnotation
      });
      return {
        ...baseNotificationMessage,
        actions: [
          {
            type: NotificationMessageActionType.ANNOTATION_COMMENT_REPLY,
            annotationId,
            parentCommentId: commentId,
            collaborators
          }
        ],
        attachments: [
          { text: commentText, url: deepLink, mentions, hasAttachments }
        ],
        html: `${span(cleanName, 'user-name')} commented on ${htmlLink}`,
        imageUrl: buildImageUrl([annotationImageId]),
        link: deepLink,
        location: getLocation({ collection, design }),
        title: `${cleanName} commented on ${normalizeTitle(design)}`
      };
    }

    case NotificationType.ANNOTATION_COMMENT_MENTION: {
      const {
        annotationId,
        annotationImageId,
        canvasId,
        designId,
        collectionId,
        commentId,
        commentText,
        hasAttachments,
        componentType
      } = notification;
      const design = { id: designId, title: notification.designTitle };
      const collaborators = await CollaboratorsDAO.findByDesign(designId);
      const collection = collectionId
        ? { id: collectionId, title: notification.collectionTitle }
        : null;
      const mentions = await getMentionsFromComment(commentText);
      const cleanName = escapeHtml(baseNotificationMessage.actor.name);
      const { deepLink, htmlLink } = getLinks({
        annotationId,
        canvasId,
        componentType: componentType as ComponentType,
        design,
        type: LinkType.DesignAnnotation
      });
      return {
        ...baseNotificationMessage,
        actions: [
          {
            type: NotificationMessageActionType.ANNOTATION_COMMENT_REPLY,
            annotationId,
            parentCommentId: commentId,
            collaborators
          }
        ],
        attachments: [
          { text: commentText, url: deepLink, mentions, hasAttachments }
        ],
        html: `${span(cleanName, 'user-name')} mentioned you on ${htmlLink}`,
        imageUrl: buildImageUrl([annotationImageId]),
        link: deepLink,
        location: getLocation({ collection, design }),
        title: `${cleanName} mentioned you on ${normalizeTitle(design)}`
      };
    }

    case NotificationType.ANNOTATION_COMMENT_REPLY: {
      const {
        annotationId,
        canvasId,
        designId,
        designImageIds,
        collectionId,
        commentId,
        commentText,
        hasAttachments,
        componentType
      } = notification;
      const design = { id: designId, title: notification.designTitle };
      const collaborators = await CollaboratorsDAO.findByDesign(designId);
      const collection = collectionId
        ? { id: collectionId, title: notification.collectionTitle }
        : null;
      const mentions = await getMentionsFromComment(commentText);
      const cleanName = escapeHtml(baseNotificationMessage.actor.name);
      const { deepLink, htmlLink } = getLinks({
        annotationId,
        canvasId,
        componentType: componentType as ComponentType,
        design,
        type: LinkType.DesignAnnotation
      });
      return {
        ...baseNotificationMessage,
        actions: [
          {
            type: NotificationMessageActionType.ANNOTATION_COMMENT_REPLY,
            annotationId,
            parentCommentId: commentId,
            collaborators
          }
        ],
        attachments: [
          { text: commentText, url: deepLink, mentions, hasAttachments }
        ],
        html: `${span(
          cleanName,
          'user-name'
        )} has replied to a comment on ${htmlLink}`,
        imageUrl: buildImageUrl(designImageIds),
        link: deepLink,
        location: getLocation({ collection, design }),
        title: `${cleanName} has replied to a comment on ${normalizeTitle(
          design
        )}`
      };
    }

    case NotificationType.MEASUREMENT_CREATE: {
      const { designId, designImageIds, collectionId } = notification;
      const design = { id: designId, title: notification.designTitle };
      const collection = collectionId
        ? { id: collectionId, title: notification.designTitle }
        : null;
      const { htmlLink, deepLink } = getLinks({
        design,
        type: LinkType.Design
      });
      const cleanName = escapeHtml(baseNotificationMessage.actor.name);
      return {
        ...baseNotificationMessage,
        html: `${span(
          cleanName,
          'user-name'
        )} added a measurement to ${htmlLink}`,
        imageUrl: buildImageUrl(designImageIds),
        link: deepLink,
        location: getLocation({ collection, design }),
        title: `${cleanName} added a measurement to ${normalizeTitle(design)}`
      };
    }

    case NotificationType.TASK_COMMENT_CREATE: {
      const {
        designId,
        designImageIds,
        collectionId,
        taskId,
        commentId,
        commentText,
        hasAttachments
      } = notification;
      const design = { id: designId, title: notification.designTitle };
      const collection = collectionId
        ? { id: collectionId, title: notification.collectionTitle }
        : null;
      const task = { id: taskId, title: notification.taskTitle };
      const collaborators = await CollaboratorsDAO.findByDesign(designId);
      const { htmlLink, deepLink } = getLinks({
        collection,
        design,
        task,
        type: LinkType.CollectionDesignTask
      });
      const comment: Comment | null = await CommentsDAO.findById(commentId);
      if (!comment) {
        return null;
      }
      const mentions = await getMentionsFromComment(commentText);
      const cleanName = escapeHtml(baseNotificationMessage.actor.name);
      return {
        ...baseNotificationMessage,
        actions: [
          {
            type: NotificationMessageActionType.TASK_COMMENT_REPLY,
            taskId,
            parentCommentId: commentId,
            collaborators
          }
        ],
        attachments: [
          { text: comment.text, url: deepLink, mentions, hasAttachments }
        ],
        html: `${span(
          cleanName,
          'user-name'
        )} commented on your task ${htmlLink}`,
        imageUrl: buildImageUrl(designImageIds),
        link: deepLink,
        location: getLocation({ collection, design }),
        title: `${cleanName} commented on your task ${normalizeTitle(task)}`
      };
    }

    case NotificationType.TASK_COMMENT_MENTION: {
      const {
        designId,
        designImageIds,
        collectionId,
        taskId,
        commentId,
        commentText,
        hasAttachments
      } = notification;
      const design = { id: designId, title: notification.designTitle };
      const collection = collectionId
        ? { id: collectionId, title: notification.collectionTitle }
        : null;
      const task = { id: taskId, title: notification.taskTitle };
      const collaborators = await CollaboratorsDAO.findByDesign(designId);
      const { htmlLink, deepLink } = getLinks({
        collection,
        design,
        task,
        type: LinkType.CollectionDesignTask
      });
      const mentions = await getMentionsFromComment(commentText);
      const cleanName = escapeHtml(baseNotificationMessage.actor.name);
      return {
        ...baseNotificationMessage,
        actions: [
          {
            type: NotificationMessageActionType.TASK_COMMENT_REPLY,
            taskId,
            parentCommentId: commentId,
            collaborators
          }
        ],
        attachments: [
          { text: commentText, url: deepLink, mentions, hasAttachments }
        ],
        html: `${span(
          cleanName,
          'user-name'
        )} mentioned you on the task ${htmlLink}`,
        imageUrl: buildImageUrl(designImageIds),
        link: deepLink,
        location: getLocation({ collection, design }),
        title: `${cleanName} mentioned you on the task ${normalizeTitle(task)}`
      };
    }

    case NotificationType.TASK_COMMENT_REPLY: {
      const {
        designId,
        designImageIds,
        collectionId,
        taskId,
        commentId,
        commentText,
        hasAttachments
      } = notification;
      const design = { id: designId, title: notification.designTitle };
      const collection = collectionId
        ? { id: collectionId, title: notification.collectionTitle }
        : null;
      const task = { id: taskId, title: notification.taskTitle };
      const collaborators = await CollaboratorsDAO.findByDesign(designId);
      const { htmlLink, deepLink } = getLinks({
        collection,
        design,
        task,
        type: LinkType.CollectionDesignTask
      });
      const mentions = await getMentionsFromComment(commentText);
      const cleanName = escapeHtml(baseNotificationMessage.actor.name);
      return {
        ...baseNotificationMessage,
        actions: [
          {
            type: NotificationMessageActionType.TASK_COMMENT_REPLY,
            taskId,
            parentCommentId: commentId,
            collaborators
          }
        ],
        attachments: [
          { text: commentText, url: deepLink, mentions, hasAttachments }
        ],
        html: `${span(
          cleanName,
          'user-name'
        )} has replied to a comment on ${htmlLink}`,
        imageUrl: buildImageUrl(designImageIds),
        link: deepLink,
        location: getLocation({ collection, design }),
        title: `${cleanName} has replied to a comment on ${normalizeTitle(
          task
        )}`
      };
    }

    case NotificationType.TASK_ASSIGNMENT: {
      const { designId, designImageIds, collectionId, taskId } = notification;
      const design = { id: designId, title: notification.designTitle };
      const collection = collectionId
        ? { id: collectionId, title: notification.collectionTitle }
        : null;
      const task = { id: taskId, title: notification.taskTitle };
      const { htmlLink, deepLink } = getLinks({
        collection,
        design,
        task,
        type: LinkType.CollectionDesignTask
      });
      const cleanName = escapeHtml(baseNotificationMessage.actor.name);
      return {
        ...baseNotificationMessage,
        html: `${span(
          cleanName,
          'user-name'
        )} assigned you the task ${htmlLink}`,
        imageUrl: buildImageUrl(designImageIds),
        link: deepLink,
        location: getLocation({ collection, design }),
        title: `${cleanName} assigned you the task ${normalizeTitle(task)}`
      };
    }

    case NotificationType.TASK_COMPLETION: {
      const { designId, designImageIds, collectionId, taskId } = notification;
      const design = { id: designId, title: notification.designTitle };
      const collection = collectionId
        ? { id: collectionId, title: notification.collectionTitle }
        : null;
      const task = { id: taskId, title: notification.taskTitle };
      const { htmlLink, deepLink } = getLinks({
        collection,
        design,
        task,
        type: LinkType.CollectionDesignTask
      });
      const cleanName = escapeHtml(baseNotificationMessage.actor.name);
      return {
        ...baseNotificationMessage,
        html: `${span(cleanName, 'user-name')} completed the task ${htmlLink}`,
        imageUrl: buildImageUrl(designImageIds),
        link: deepLink,
        location: getLocation({ collection, design }),
        title: `${cleanName} completed the task ${normalizeTitle(task)}`
      };
    }

    case NotificationType.PARTNER_ACCEPT_SERVICE_BID: {
      const { designId } = notification;
      const design = { id: designId, title: notification.designTitle };
      const { htmlLink, deepLink } = getLinks({
        design,
        type: LinkType.Design
      });
      const cleanName = escapeHtml(baseNotificationMessage.actor.name);
      return {
        ...baseNotificationMessage,
        html: `${span(
          cleanName,
          'user-name'
        )} accepted the service bid for ${htmlLink}`,
        imageUrl: null,
        link: deepLink,
        location: getLocation({ collection: null, design }),
        title: `${cleanName} accepted the service bid for ${normalizeTitle(
          design
        )}`
      };
    }

    case NotificationType.PARTNER_DESIGN_BID: {
      const { designId } = notification;
      const design = { id: designId, title: notification.designTitle };
      const { deepLink } = getLinks({
        design,
        type: LinkType.PartnerDesign
      });
      return {
        ...baseNotificationMessage,
        html: `You have a <a href="${deepLink}">new project</a> to review`,
        imageUrl: null,
        link: deepLink,
        location: getLocation({ collection: null, design }),
        title: 'You have a new project to review'
      };
    }

    case NotificationType.PARTNER_REJECT_SERVICE_BID: {
      const { designId } = notification;
      const design = { id: designId, title: notification.designTitle };
      const { htmlLink, deepLink } = getLinks({
        design,
        type: LinkType.Design
      });
      const cleanName = escapeHtml(baseNotificationMessage.actor.name);
      return {
        ...baseNotificationMessage,
        html: `${span(
          cleanName,
          'user-name'
        )} rejected the service bid for ${htmlLink}`,
        imageUrl: null,
        link: deepLink,
        location: getLocation({ collection: null, design }),
        title: `${cleanName} rejected the service bid for ${normalizeTitle(
          design
        )}`
      };
    }

    case NotificationType.PARTNER_PAIRING_COMMITTED: {
      const { collectionId } = notification;
      const collection = {
        id: collectionId,
        title: notification.collectionTitle
      };
      const { htmlLink, deepLink } = getLinks({
        collection,
        type: LinkType.Collection
      });
      return {
        ...baseNotificationMessage,
        html: `${htmlLink} has been paired with all partners! 🎉 You can now track development progress on Timeline.`,
        imageUrl: null,
        link: deepLink,
        location: [],
        title: `Your collection, ${normalizeTitle(
          collection
        )} has been paired with all partners! 🙌`
      };
    }

    case NotificationType.COLLECTION_SUBMIT: {
      const { collectionId } = notification;
      const collection = {
        id: collectionId,
        title: notification.collectionTitle
      };
      if (!collection) {
        return null;
      }
      const { htmlLink, deepLink } = getLinks({
        collection,
        type: LinkType.Collection
      });
      return {
        ...baseNotificationMessage,
        html: `${htmlLink} has been submitted, and will be reviewed by our team`,
        imageUrl: null,
        link: deepLink,
        location: [],
        title: `${normalizeTitle(
          collection
        )} has been submitted, and will be review by our team`
      };
    }

    case NotificationType.COMMIT_COST_INPUTS: {
      const { collectionId } = notification;
      const collection = {
        id: collectionId,
        title: notification.collectionTitle
      };
      const { htmlLink, deepLink } = getLinks({
        collection,
        isCheckout: true,
        type: LinkType.Collection
      });
      return {
        ...baseNotificationMessage,
        html: `${htmlLink} has been reviewed and is now ready for checkout`,
        imageUrl: null,
        link: deepLink,
        location: [],
        title: `${normalizeTitle(
          collection
        )} has been reviewed and is now ready for checkout`
      };
    }

    case NotificationType.COSTING_EXPIRED: {
      const { collectionId } = notification;
      const collection = {
        id: collectionId,
        title: notification.collectionTitle
      };
      const { htmlLink, deepLink } = getLinks({
        collection,
        isSubmit: true,
        type: LinkType.Collection
      });
      return {
        ...baseNotificationMessage,
        html: `${htmlLink} pricing has expired. Please resubmit for updated costing.`,
        imageUrl: null,
        link: deepLink,
        location: [],
        title: `Pricing for ${normalizeTitle(collection)} has expired.`
      };
    }

    case NotificationType.COSTING_EXPIRATION_TWO_DAYS: {
      const { collectionId } = notification;
      const collection = {
        id: collectionId,
        title: notification.collectionTitle
      };
      const { htmlLink, deepLink } = getLinks({
        collection,
        isCheckout: true,
        type: LinkType.Collection
      });
      return {
        ...baseNotificationMessage,
        html: `${htmlLink} pricing expires in 48 hours.`,
        imageUrl: null,
        link: deepLink,
        location: [],
        title: `Pricing for ${normalizeTitle(
          collection
        )} will expire in 48 hours.`
      };
    }

    case NotificationType.COSTING_EXPIRATION_ONE_WEEK: {
      const { collectionId } = notification;
      const collection = {
        id: collectionId,
        title: notification.collectionTitle
      };
      const { htmlLink, deepLink } = getLinks({
        collection,
        isCheckout: true,
        type: LinkType.Collection
      });
      return {
        ...baseNotificationMessage,
        html: `${htmlLink} pricing expires in 7 days.`,
        imageUrl: null,
        link: deepLink,
        location: [],
        title: `Pricing for ${normalizeTitle(
          collection
        )} will expire in 7 days.`
      };
    }

    case NotificationType.APPROVAL_STEP_COMMENT_MENTION: {
      const {
        designId,
        designImageIds,
        collectionId,
        commentId,
        commentText,
        hasAttachments
      } = notification;
      const design = { id: designId, title: notification.designTitle };
      const collection = {
        id: collectionId,
        title: notification.collectionTitle
      };
      const approvalStep = {
        id: notification.approvalStepId,
        title: notification.approvalStepTitle
      };

      const collaborators = await CollaboratorsDAO.findByDesign(designId);
      const { htmlLink: stepHtmlLink, deepLink } = getLinks({
        collection,
        design,
        approvalStep,
        type: LinkType.ApprovalStep
      });
      const designHtmlLink = constructHtmlLink(
        deepLink,
        normalizeTitle(design)
      );
      const mentions = await getMentionsFromComment(commentText);
      const cleanName = escapeHtml(baseNotificationMessage.actor.name);
      return {
        ...baseNotificationMessage,
        actions: [
          {
            type: NotificationMessageActionType.APPROVAL_STEP_COMMENT_REPLY,
            approvalStepId: notification.approvalStepId,
            parentCommentId: commentId,
            collaborators
          }
        ],
        attachments: [
          { text: commentText, url: deepLink, mentions, hasAttachments }
        ],
        html: `${span(
          cleanName,
          'user-name'
        )} mentioned you on ${stepHtmlLink} for ${designHtmlLink}`,
        imageUrl: buildImageUrl(designImageIds),
        link: deepLink,
        location: getLocation({ collection, design }),
        title: `${cleanName} mentioned you on ${normalizeTitle(
          approvalStep
        )} for ${normalizeTitle(design)}`
      };
    }

    default: {
      throw new InvalidDataError(
        `Unknown notification type found with id ${notification!.id} and type ${
          notification!.type
        }`
      );
    }
  }
}
