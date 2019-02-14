import { escape } from 'lodash';
import { Notification, NotificationMessage, NotificationType } from './domain-object';
import ProductDesign = require('../../domain-objects/product-design');
import * as UsersDAO from '../../dao/users';
import * as ProductDesignsDAO from '../../dao/product-designs';
import * as CollectionsDAO from '../../dao/collections';
import * as TaskEventsDAO from '../../dao/task-events';
import * as CommentsDAO from '../../dao/comments';
import * as CanvasesDAO from '../../dao/product-design-canvases';
import * as ComponentsDAO from '../../dao/components';
import * as AnnotationCommentsDAO from '../../dao/product-design-canvas-annotation-comments';
import getTitle, { LinkBase } from '../../services/get-title';
import { logWarning } from '../../services/logger';
import Comment from '../../domain-objects/comment';
import { ComponentType } from '../../domain-objects/component';
import ProductDesignCanvas from '../../domain-objects/product-design-canvas';
import { STUDIO_HOST } from '../../config';

function getDeepLink(
  linkBase: LinkBase,
  annotationId?: string,
  canvasId?: string,
  componentType?: ComponentType
): { deepLink: string, htmlLink: string } {
  const { design, collection, task } = linkBase;
  if (annotationId && canvasId && design && componentType) {
    const tab = componentType === ComponentType.Artwork
      ? 'tab=artwork&'
      : componentType === ComponentType.Material
        ? 'tab=materials&'
        : '';
    // tslint:disable-next-line:max-line-length
    const deepLink = `${STUDIO_HOST}/designs?${tab}previewDesignId=${design.id}&canvasId=${canvasId}&annotationId=${annotationId}`;
    const title = getTitle(linkBase);
    return {
      deepLink,
      htmlLink: constructHtmlLink(deepLink, title)
    };
  }
  if (task && design && collection) {
    // tslint:disable-next-line:max-line-length
    const deepLink = `${STUDIO_HOST}/collections/${collection.id}/tasks/design/${design.id}?taskId=${task.id}&designId=${design.id}`;
    const title = getTitle(linkBase);
    return {
      deepLink,
      htmlLink: constructHtmlLink(deepLink, title)
    };
  }
  if (design && collection) {
    // tslint:disable-next-line:max-line-length
    const deepLink = `${STUDIO_HOST}/collections/${collection.id}/designs?previewDesignId=${design.id}`;
    const title = getTitle(linkBase);
    return {
      deepLink,
      htmlLink: constructHtmlLink(deepLink, title)
    };
  }
  if (design) {
    const deepLink = `${STUDIO_HOST}/designs?previewDesignId=${design.id}`;
    const title = getTitle(linkBase);
    return {
      deepLink,
      htmlLink: constructHtmlLink(deepLink, title)
    };
  }
  if (collection) {
    const deepLink = `${STUDIO_HOST}/collections/${collection.id}`;
    const title = getTitle(linkBase);
    return {
      deepLink,
      htmlLink: constructHtmlLink(deepLink, title)
    };
  }
  throw new Error('Neither a collection or design was specified!');
}

function constructHtmlLink(deepLink: string, title: string): string {
  return `
  <a href="${deepLink}">
    ${escape(title)}
  </a>
  `;
}

function span(text: string, className?: string): string {
  return `<span class='${className}'>${text}</span>`;
}

function findImageUrl(design: ProductDesign): string | null {
  if (design.imageLinks && design.imageLinks.length > 0) {
    return design.imageLinks[0].thumbnailLink;
  }
  return null;
}

export const createNotificationMessage = async (
  notification: Notification
): Promise<NotificationMessage | null> => {
  const baseNotificationMessage = {
    actor: await UsersDAO.findById(notification.actorUserId),
    createdAt: notification.createdAt,
    id: notification.id
  };

  switch (notification.type) {
    case (NotificationType.INVITE_COLLABORATOR): {
      const collection = notification.collectionId
        ? await CollectionsDAO.findById(notification.collectionId)
        : null;
      const design = notification.designId
        ? await ProductDesignsDAO.findById(notification.designId)
        : null;
      if (!collection && !design) { return null; }
      const { deepLink, htmlLink } = getDeepLink({ design, collection });
      const cleanName = escape(baseNotificationMessage.actor.name);
      return {
        ...baseNotificationMessage,
        attachments: [],
        html:
        `${span(cleanName, 'user-name')} invited you to collaborate on ${htmlLink}`,
        imageUrl: design ? findImageUrl(design) : null,
        location: [{ text: getTitle({ design, collection }), url: deepLink }]
      };
    }

    case (NotificationType.DESIGN_UPDATE): {
      const design = notification.designId
        ? await ProductDesignsDAO.findById(notification.designId)
        : null;
      if (!design) { return null; }
      const { deepLink, htmlLink } = getDeepLink({ design });
      const cleanName = escape(baseNotificationMessage.actor.name);
      return {
        ...baseNotificationMessage,
        attachments: [],
        html: `${span(cleanName, 'user-name')} updated ${htmlLink}`,
        imageUrl: design ? findImageUrl(design) : null,
        location: [{ text: getTitle({ design }), url: deepLink }]
      };
    }

    case (NotificationType.ANNOTATION_CREATE): {
      const design = notification.designId
        ? await ProductDesignsDAO.findById(notification.designId)
        : null;
      const canvas: ProductDesignCanvas | null = await CanvasesDAO.findById(notification.canvasId);
      if (!design || !canvas) { return null; }
      const comments: Comment[] | null = await AnnotationCommentsDAO
        .findByAnnotationId(notification.annotationId);
      const component = canvas.componentId
        ? await ComponentsDAO.findById(canvas.componentId)
        : undefined;
      const componentType = component
        ? component.type
        : undefined;
      const comment = comments ? comments[0] : null;
      const commentText = comment ? comment.text : '';
      const cleanName = escape(baseNotificationMessage.actor.name);
      const { deepLink, htmlLink } = getDeepLink(
        { design },
        notification.annotationId,
        notification.canvasId,
        componentType
      );
      return {
        ...baseNotificationMessage,
        attachments: [{ text: commentText, url: deepLink }],
        html: `${span(cleanName, 'user-name')} commented on ${htmlLink}`,
        imageUrl: design ? findImageUrl(design) : null,
        location: [{ text: getTitle({ design }), url: deepLink }]
      };
    }

    case (NotificationType.MEASUREMENT_CREATE): {
      const design = notification.designId
        ? await ProductDesignsDAO.findById(notification.designId)
        : null;
      if (!design) { return null; }
      const { deepLink, htmlLink } = getDeepLink({ design });
      const cleanName = escape(baseNotificationMessage.actor.name);
      return {
        ...baseNotificationMessage,
        attachments: [],
        html: `${span(cleanName, 'user-name')} added a measurement to ${htmlLink}`,
        imageUrl: design ? findImageUrl(design) : null,
        location: [{ text: getTitle({ design }), url: deepLink }]
      };
    }

    case (NotificationType.TASK_COMMENT_CREATE): {
      const design = notification.designId
        ? await ProductDesignsDAO.findById(notification.designId)
        : null;
      const collection = notification.collectionId
        ? await CollectionsDAO.findById(notification.collectionId)
        : null;
      const task = notification.taskId
        ? await TaskEventsDAO.findById(notification.taskId)
        : null;
      if (!design) { return null; }
      const { htmlLink, deepLink } = getDeepLink({ design, collection, task });
      const { deepLink: designLink } = getDeepLink({ design, collection });
      const { deepLink: collectionLink } = getDeepLink({ collection });
      const comment: Comment | null = await CommentsDAO.findById(notification.commentId);
      const commentText = comment ? comment.text : '';
      const cleanName = escape(baseNotificationMessage.actor.name);
      return {
        ...baseNotificationMessage,
        attachments: [{ text: commentText, url: deepLink }],
        html: `${span(cleanName, 'user-name')} commented on your task ${htmlLink}`,
        imageUrl: design ? findImageUrl(design) : null,
        location: [{ text: getTitle({ collection }), url: collectionLink },
        { text: getTitle({ design }), url: designLink }]
      };
    }

    case (NotificationType.TASK_ASSIGNMENT): {
      const design = notification.designId
        ? await ProductDesignsDAO.findById(notification.designId)
        : null;
      const collection = notification.collectionId
        ? await CollectionsDAO.findById(notification.collectionId)
        : null;
      const task = notification.taskId
        ? await TaskEventsDAO.findById(notification.taskId)
        : null;
      if (!design) { return null; }
      const { htmlLink } = getDeepLink({ design, collection, task });
      const { deepLink: designLink } = getDeepLink({ design, collection });
      const { deepLink: collectionLink } = getDeepLink({ collection });
      const cleanName = escape(baseNotificationMessage.actor.name);
      return {
        ...baseNotificationMessage,
        attachments: [],
        html: `${span(cleanName, 'user-name')} assigned you the task ${htmlLink}`,
        imageUrl: design ? findImageUrl(design) : null,
        location: [{ text: getTitle({ collection }), url: collectionLink },
          { text: getTitle({ design }), url: designLink }]
      };
    }

    case (NotificationType.TASK_COMPLETION): {
      const design = notification.designId
        ? await ProductDesignsDAO.findById(notification.designId)
        : null;
      const collection = notification.collectionId
        ? await CollectionsDAO.findById(notification.collectionId)
        : null;
      const task = notification.taskId
        ? await TaskEventsDAO.findById(notification.taskId)
        : null;
      if (!design) { return null; }
      const { htmlLink } = getDeepLink({ design, collection, task });
      const { deepLink: designLink } = getDeepLink({ design, collection });
      const { deepLink: collectionLink } = getDeepLink({ collection });
      const cleanName = escape(baseNotificationMessage.actor.name);
      return {
        ...baseNotificationMessage,
        attachments: [],
        html: `${span(cleanName, 'user-name')} completed the task ${htmlLink}`,
        imageUrl: design ? findImageUrl(design) : null,
        location: [{ text: getTitle({ collection }), url: collectionLink },
          { text: getTitle({ design }), url: designLink }]
      };
    }

    case (NotificationType.PARTNER_ACCEPT_SERVICE_BID): {
      const design = notification.designId
        ? await ProductDesignsDAO.findById(notification.designId)
        : null;
      if (!design) { return null; }
      const { deepLink, htmlLink } = getDeepLink({ design });
      const cleanName = escape(baseNotificationMessage.actor.name);
      return {
        ...baseNotificationMessage,
        attachments: [],
        html: `${span(cleanName, 'user-name')} accepted the service bid for ${htmlLink}`,
        imageUrl: null,
        location: [{ text: getTitle({ design }), url: deepLink }]
      };
    }

    case (NotificationType.PARTNER_DESIGN_BID): {
      const design = notification.designId
        ? await ProductDesignsDAO.findById(notification.designId)
        : null;
      if (!design) { return null; }
      const { deepLink } = getDeepLink({ design });
      return {
        ...baseNotificationMessage,
        attachments: [],
        html: `You have a <a href="${deepLink}">new project</a> to review`,
        imageUrl: null,
        location: [{ text: getTitle({ design }), url: deepLink }]
      };
    }

    case (NotificationType.PARTNER_REJECT_SERVICE_BID): {
      const design = notification.designId
        ? await ProductDesignsDAO.findById(notification.designId)
        : null;
      if (!design) { return null; }
      const { deepLink, htmlLink } = getDeepLink({ design });
      const cleanName = escape(baseNotificationMessage.actor.name);
      return {
        ...baseNotificationMessage,
        attachments: [],
        html: `${span(cleanName, 'user-name')} rejected the service bid for ${htmlLink}`,
        imageUrl: null,
        location: [{ text: getTitle({ design }), url: deepLink }]
      };
    }

    case (NotificationType.COLLECTION_SUBMIT): {
      const collection = notification.collectionId
        ? await CollectionsDAO.findById(notification.collectionId)
        : null;
      if (!collection) { return null; }
      const { deepLink, htmlLink } = getDeepLink({ collection });
      return {
        ...baseNotificationMessage,
        attachments: [],
        html: `${htmlLink} has been submitted, and will be review by our team`,
        imageUrl: null,
        location: [{ text: getTitle({ collection }), url: deepLink }]
      };
    }

    case (NotificationType.COMMIT_COST_INPUTS): {
      const collection = notification.collectionId
        ? await CollectionsDAO.findById(notification.collectionId)
        : null;
      if (!collection) { return null; }
      const { deepLink, htmlLink } = getDeepLink({ collection });
      return {
        ...baseNotificationMessage,
        attachments: [],
        html: `${htmlLink} has been reviewed and is now ready for checkout`,
        imageUrl: null,
        location: [{ text: getTitle({ collection }), url: deepLink }]
      };
    }

    default: {
      logWarning(
        `Malformed notification found with type ${notification.type} and id ${notification.id}`);
      return null;
    }
  }
};
