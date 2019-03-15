import { escape } from 'lodash';
import { BreadCrumb, NotificationMessage } from '@cala/ts-lib';

import InvalidDataError = require('../../errors/invalid-data');
import * as ComponentsDAO from '../../dao/components';
import ProductDesign = require('../../domain-objects/product-design');
import * as UsersDAO from '../../dao/users';
import * as ProductDesignsDAO from '../../dao/product-designs';
import * as CollectionsDAO from '../../dao/collections';
import * as TaskEventsDAO from '../../dao/task-events';
import * as CommentsDAO from '../../components/comments/dao';
import * as CanvasesDAO from '../../dao/product-design-canvases';
import { Notification, NotificationType } from './domain-object';
import * as AnnotationCommentsDAO from '../annotation-comments/dao';
import getTitle, { LinkBase } from '../../services/get-title';
import Comment from '../../components/comments/domain-object';
import { CommentWithMeta } from '../../components/annotation-comments/domain-object';
import { ComponentType } from '../../domain-objects/component';
import ProductDesignCanvas from '../../domain-objects/product-design-canvas';
import { STUDIO_HOST } from '../../config';
import { DetailsTask } from '../../domain-objects/task-event';
import Collection from '../../domain-objects/collection';
import parseCommentText from '../../services/parse-comment-text';

interface LinkOptions {
  annotationId?: string | null;
  canvasId?: string | null;
  componentType?: ComponentType;
  isCheckout?: boolean;
}

function getDeepLink(
  linkBase: LinkBase,
  options: LinkOptions = {}
): { deepLink: string, htmlLink: string } {
  const { design, collection, task } = linkBase;
  const { annotationId, canvasId, componentType, isCheckout } = options;
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
    const deepLink = `${STUDIO_HOST}/collections/${collection.id}${isCheckout
      ? '?isCheckout=true'
      : ''}`;
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

async function getDesign(designId: string | null): Promise<ProductDesign | null> {
  const design = designId
    ? await ProductDesignsDAO.findById(designId)
    : null;
  return design;
}
async function getCollection(collectionId: string | null): Promise<Collection | null> {
  const collection = collectionId
    ? await CollectionsDAO.findById(collectionId)
    : null;
  return collection;
}
async function getTask(taskId: string | null): Promise<DetailsTask | null> {
  const task = taskId
    ? await TaskEventsDAO.findById(taskId)
    : null;
  return task;
}

function getLocation(
  { collection, design }: {collection: Collection | null, design: ProductDesign | null}
): BreadCrumb[] {
  const location = [];
  if (collection) {
    const { deepLink: collectionLink } = getDeepLink({ collection });
    location.push({ text: getTitle({ collection }), url: collectionLink });
  }
  if (design) {
    const { deepLink: designLink } = getDeepLink({ collection, design });
    location.push({ text: getTitle({ design }), url: designLink });
  }
  return location;
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
      const collectionOrDesignName = getTitle({ collection, design });
      const { htmlLink, deepLink } = getDeepLink({ design, collection });
      const cleanName = escape(baseNotificationMessage.actor.name);
      return {
        ...baseNotificationMessage,
        attachments: [],
        html:
        `${span(cleanName, 'user-name')} invited you to collaborate on ${htmlLink}`,
        imageUrl: design ? findImageUrl(design) : null,
        link: deepLink,
        location: getLocation({ collection, design }),
        // tslint:disable-next-line:max-line-length
        title: `${cleanName} invited you to collaborate on ${collectionOrDesignName}`
      };
    }

    case (NotificationType.ANNOTATION_CREATE): {
      const { designId, collectionId } = notification;
      const design = await getDesign(designId);
      const collection = await getCollection(collectionId);
      const canvas: ProductDesignCanvas | null = await CanvasesDAO.findById(notification.canvasId);
      if (!design || !canvas) { return null; }
      const comments: CommentWithMeta[] | null = await AnnotationCommentsDAO
        .findByAnnotationId(notification.annotationId);
      const component = canvas.componentId
        ? await ComponentsDAO.findById(canvas.componentId)
        : undefined;
      const componentType = component
        ? component.type
        : undefined;
      const comment = comments ? comments[0] : null;
      const commentText = comment ? await parseCommentText(comment.text) : '';
      const cleanName = escape(baseNotificationMessage.actor.name);
      const { deepLink, htmlLink } = getDeepLink(
        { design },
        {
          annotationId: notification.annotationId,
          canvasId: notification.canvasId,
          componentType
        }
      );
      return {
        ...baseNotificationMessage,
        attachments: [{ text: commentText, url: deepLink }],
        html: `${span(cleanName, 'user-name')} commented on ${htmlLink}`,
        imageUrl: design ? findImageUrl(design) : null,
        link: deepLink,
        location: getLocation({ collection, design }),
        title: `${cleanName} commented on ${getTitle({ design })}`
      };
    }

    case (NotificationType.MEASUREMENT_CREATE): {
      const { designId, collectionId } = notification;
      const design = await getDesign(designId);
      const collection = await getCollection(collectionId);
      if (!design) { return null; }
      const { htmlLink, deepLink } = getDeepLink({ design });
      const cleanName = escape(baseNotificationMessage.actor.name);
      return {
        ...baseNotificationMessage,
        attachments: [],
        html: `${span(cleanName, 'user-name')} added a measurement to ${htmlLink}`,
        imageUrl: design ? findImageUrl(design) : null,
        link: deepLink,
        location: getLocation({ collection, design }),
        title: `${cleanName} added a measurement to ${getTitle({ design })}`
      };
    }

    case (NotificationType.TASK_COMMENT_CREATE): {
      const { designId, collectionId, taskId } = notification;
      const design = await getDesign(designId);
      const collection = await getCollection(collectionId);
      const task = await getTask(taskId);
      if (!design || !task) { return null; }
      const { htmlLink, deepLink } = getDeepLink({ design, collection, task });
      const comment: Comment | null = await CommentsDAO.findById(notification.commentId);
      const commentText = comment ? await parseCommentText(comment.text) : '';
      const cleanName = escape(baseNotificationMessage.actor.name);
      return {
        ...baseNotificationMessage,
        attachments: [{ text: commentText, url: deepLink }],
        html: `${span(cleanName, 'user-name')} commented on your task ${htmlLink}`,
        imageUrl: design ? findImageUrl(design) : null,
        link: deepLink,
        location: getLocation({ collection, design }),
        title: `${cleanName} commented on your task ${getTitle({ task })}`
      };
    }

    case (NotificationType.TASK_ASSIGNMENT): {
      const { designId, collectionId, taskId } = notification;
      const design = await getDesign(designId);
      const collection = await getCollection(collectionId);
      const task = await getTask(taskId);
      if (!design || !task) { return null; }
      const { htmlLink, deepLink } = getDeepLink({ design, collection, task });
      const cleanName = escape(baseNotificationMessage.actor.name);
      return {
        ...baseNotificationMessage,
        attachments: [],
        html: `${span(cleanName, 'user-name')} assigned you the task ${htmlLink}`,
        imageUrl: design ? findImageUrl(design) : null,
        link: deepLink,
        location: getLocation({ collection, design }),
        title: `${cleanName} assigned you the task ${getTitle({ task })}`
      };
    }

    case (NotificationType.TASK_COMPLETION): {
      const { designId, collectionId, taskId } = notification;
      const design = await getDesign(designId);
      const collection = await getCollection(collectionId);
      const task = await getTask(taskId);
      if (!design || !task) { return null; }
      const { htmlLink, deepLink } = getDeepLink({ design, collection, task });
      const cleanName = escape(baseNotificationMessage.actor.name);
      return {
        ...baseNotificationMessage,
        attachments: [],
        html: `${span(cleanName, 'user-name')} completed the task ${htmlLink}`,
        imageUrl: design ? findImageUrl(design) : null,
        link: deepLink,
        location: getLocation({ collection, design }),
        title: `${cleanName} completed the task ${getTitle({ task })}`
      };
    }

    case (NotificationType.PARTNER_ACCEPT_SERVICE_BID): {
      const { designId } = notification;
      const design = await getDesign(designId);
      if (!design) { return null; }
      const collectionId = (design.collectionIds && design.collectionIds[0]) || null;
      const collection = await getCollection(collectionId);
      const { htmlLink, deepLink } = getDeepLink({ design });
      const cleanName = escape(baseNotificationMessage.actor.name);
      return {
        ...baseNotificationMessage,
        attachments: [],
        html: `${span(cleanName, 'user-name')} accepted the service bid for ${htmlLink}`,
        imageUrl: null,
        link: deepLink,
        location: getLocation({ collection, design }),
        title: `${cleanName} accepted the service bid for ${getTitle({ design })}`
      };
    }

    case (NotificationType.PARTNER_DESIGN_BID): {
      const { designId } = notification;
      const design = await getDesign(designId);
      if (!design) { return null; }
      const collectionId = (design.collectionIds && design.collectionIds[0]) || null;
      const collection = await getCollection(collectionId);
      const { deepLink } = getDeepLink({ design });
      return {
        ...baseNotificationMessage,
        attachments: [],
        html: `You have a <a href="${deepLink}">new project</a> to review`,
        imageUrl: null,
        link: deepLink,
        location: getLocation({ collection, design }),
        title: 'You have a new project to review'
      };
    }

    case (NotificationType.PARTNER_REJECT_SERVICE_BID): {
      const { designId } = notification;
      const design = await getDesign(designId);
      if (!design) { return null; }
      const collectionId = (design.collectionIds && design.collectionIds[0]) || null;
      const collection = await getCollection(collectionId);
      const { htmlLink, deepLink } = getDeepLink({ design });
      const cleanName = escape(baseNotificationMessage.actor.name);
      return {
        ...baseNotificationMessage,
        attachments: [],
        html: `${span(cleanName, 'user-name')} rejected the service bid for ${htmlLink}`,
        imageUrl: null,
        link: deepLink,
        location: getLocation({ collection, design }),
        title: `${cleanName} rejected the service bid for ${getTitle({ design })}`
      };
    }

    case (NotificationType.COLLECTION_SUBMIT): {
      const { collectionId } = notification;
      const collection = await getCollection(collectionId);
      if (!collection) { return null; }
      const { htmlLink, deepLink } = getDeepLink({ collection });
      return {
        ...baseNotificationMessage,
        attachments: [],
        html: `${htmlLink} has been submitted, and will be reviewed by our team`,
        imageUrl: null,
        link: deepLink,
        location: [],
        title: `${getTitle({ collection })} has been submitted, and will be review by our team`
      };
    }

    case (NotificationType.COMMIT_COST_INPUTS): {
      const { collectionId } = notification;
      const collection = await getCollection(collectionId);
      if (!collection) { return null; }
      const { htmlLink, deepLink } = getDeepLink({ collection }, { isCheckout: true });
      return {
        ...baseNotificationMessage,
        attachments: [],
        html: `${htmlLink} has been reviewed and is now ready for checkout`,
        imageUrl: null,
        link: deepLink,
        location: [],
        title: `${getTitle({ collection })} has been reviewed and is now ready for checkout`
      };
    }

    default: {
      // tslint:disable-next-line:max-line-length
      throw new InvalidDataError(`Unknown notification type found with id ${notification!.id} and type ${notification!.type}`);
    }
  }
};
