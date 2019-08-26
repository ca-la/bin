import { escape as escapeHtml } from 'lodash';
import { BreadCrumb, NotificationMessage } from '@cala/ts-lib';

import InvalidDataError = require('../../errors/invalid-data');
import * as ComponentsDAO from '../components/dao';
import ProductDesign = require('../product-designs/domain-objects/product-design');
import * as UsersDAO from '../../components/users/dao';
import * as ProductDesignsDAO from '../product-designs/dao';
import * as CollectionsDAO from '../collections/dao';
import * as TaskEventsDAO from '../../dao/task-events';
import * as CommentsDAO from '../../components/comments/dao';
import * as CanvasesDAO from '../canvases/dao';
import * as MeasurementsDAO from '../../dao/product-design-canvas-measurements';
import {
  DEPRECATED_NOTIFICATION_TYPES,
  Notification,
  NotificationType
} from './domain-object';
import getLinks, { LinkType } from './get-links';
import normalizeTitle from '../../services/normalize-title';
import Comment from '../../components/comments/domain-object';
import { ComponentType } from '../components/domain-object';
import Canvas from '../canvases/domain-object';
import { DetailsTask } from '../../domain-objects/task-event';
import Collection from '../collections/domain-object';
import { addAtMentionDetailsForComment } from '../../services/add-at-mention-details';

function span(text: string, className?: string): string {
  return `<span class='${className}'>${text}</span>`;
}

function findImageUrl(design: ProductDesign): string | null {
  if (design.imageLinks && design.imageLinks.length > 0) {
    return design.imageLinks[0].thumbnailLink;
  }
  return null;
}

async function getDesign(
  designId: string | null
): Promise<ProductDesign | null> {
  const design = designId ? await ProductDesignsDAO.findById(designId) : null;
  return design;
}
async function getCollection(
  collectionId: string | null
): Promise<Collection | null> {
  const collection = collectionId
    ? await CollectionsDAO.findById(collectionId)
    : null;
  return collection;
}
async function getTask(taskId: string | null): Promise<DetailsTask | null> {
  const task = taskId ? await TaskEventsDAO.findById(taskId) : null;
  return task;
}

function getLocation({
  collection,
  design
}: {
  collection: Collection | null;
  design: ProductDesign | null;
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

export const createNotificationMessage = async (
  notification: Notification
): Promise<NotificationMessage | null> => {
  if (DEPRECATED_NOTIFICATION_TYPES.includes(notification.type)) {
    return null;
  }

  const baseNotificationMessage = {
    actor: await UsersDAO.findById(notification.actorUserId),
    createdAt: notification.createdAt,
    id: notification.id,
    readAt: notification.readAt
  };

  if (!baseNotificationMessage.actor) {
    throw new Error('Actor could not be found!');
  }

  switch (notification.type) {
    case NotificationType.INVITE_COLLABORATOR: {
      const collection = notification.collectionId
        ? await CollectionsDAO.findById(notification.collectionId)
        : null;
      const design = notification.designId
        ? await ProductDesignsDAO.findById(notification.designId)
        : null;
      if (!collection && !design) {
        return null;
      }
      const resourceName = normalizeTitle(design || collection);
      const cleanName = escapeHtml(baseNotificationMessage.actor.name);
      const partialMessage = {
        ...baseNotificationMessage,
        attachments: [],
        imageUrl: design ? findImageUrl(design) : null,
        location: getLocation({ collection, design }),
        title: `${cleanName} invited you to collaborate on ${resourceName}`
      };

      if (collection) {
        const { htmlLink, deepLink } = getLinks({
          collection,
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

      if (design) {
        const { htmlLink, deepLink } = getLinks({
          design,
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
      const { designId, collectionId, commentId } = notification;
      const design = await getDesign(designId);
      const collection = await getCollection(collectionId);
      const canvas: Canvas | null = await CanvasesDAO.findById(
        notification.canvasId
      );
      if (!design || !canvas) {
        return null;
      }
      const component = canvas.componentId
        ? await ComponentsDAO.findById(canvas.componentId)
        : undefined;
      const componentType = component ? component.type : ComponentType.Sketch;
      const comment = await CommentsDAO.findById(commentId);
      if (!comment) {
        return null;
      }
      const { mentions } = await addAtMentionDetailsForComment(comment);
      const cleanName = escapeHtml(baseNotificationMessage.actor.name);
      const { deepLink, htmlLink } = getLinks({
        annotationId: notification.annotationId,
        canvasId: notification.canvasId,
        componentType,
        design,
        type: LinkType.DesignAnnotation
      });
      return {
        ...baseNotificationMessage,
        attachments: [{ text: comment.text, url: deepLink, mentions }],
        html: `${span(cleanName, 'user-name')} commented on ${htmlLink}`,
        imageUrl: design ? findImageUrl(design) : null,
        link: deepLink,
        location: getLocation({ collection, design }),
        title: `${cleanName} commented on ${normalizeTitle(design)}`
      };
    }

    case NotificationType.ANNOTATION_COMMENT_MENTION: {
      const { designId, collectionId, commentId } = notification;
      const design = await getDesign(designId);
      const collection = await getCollection(collectionId);
      const canvas: Canvas | null = await CanvasesDAO.findById(
        notification.canvasId
      );
      if (!design || !canvas) {
        return null;
      }
      const component = canvas.componentId
        ? await ComponentsDAO.findById(canvas.componentId)
        : undefined;
      const componentType = component ? component.type : ComponentType.Sketch;
      const comment = await CommentsDAO.findById(commentId);
      if (!comment) {
        return null;
      }
      const { mentions } = await addAtMentionDetailsForComment(comment);
      const cleanName = escapeHtml(baseNotificationMessage.actor.name);
      const { deepLink, htmlLink } = getLinks({
        annotationId: notification.annotationId,
        canvasId: notification.canvasId,
        componentType,
        design,
        type: LinkType.DesignAnnotation
      });
      return {
        ...baseNotificationMessage,
        attachments: [{ text: comment.text, url: deepLink, mentions }],
        html: `${span(cleanName, 'user-name')} mentioned you on ${htmlLink}`,
        imageUrl: design ? findImageUrl(design) : null,
        link: deepLink,
        location: getLocation({ collection, design }),
        title: `${cleanName} mentioned you on ${normalizeTitle(design)}`
      };
    }

    case NotificationType.MEASUREMENT_CREATE: {
      const { designId, collectionId, measurementId } = notification;
      const design = await getDesign(designId);
      const collection = await getCollection(collectionId);
      const measurement = await MeasurementsDAO.findById(measurementId);
      if (!design || !measurement) {
        return null;
      }
      const { htmlLink, deepLink } = getLinks({
        design,
        type: LinkType.Design
      });
      const cleanName = escapeHtml(baseNotificationMessage.actor.name);
      return {
        ...baseNotificationMessage,
        attachments: [],
        html: `${span(
          cleanName,
          'user-name'
        )} added a measurement to ${htmlLink}`,
        imageUrl: design ? findImageUrl(design) : null,
        link: deepLink,
        location: getLocation({ collection, design }),
        title: `${cleanName} added a measurement to ${normalizeTitle(design)}`
      };
    }

    case NotificationType.TASK_COMMENT_CREATE: {
      const { designId, collectionId, taskId } = notification;
      const design = await getDesign(designId);
      const collection = await getCollection(collectionId);
      const task = await getTask(taskId);
      if (!design || !task) {
        return null;
      }
      const { htmlLink, deepLink } = getLinks({
        collection,
        design,
        task,
        type: LinkType.CollectionDesignTask
      });
      const comment: Comment | null = await CommentsDAO.findById(
        notification.commentId
      );
      if (!comment) {
        return null;
      }
      const { mentions } = await addAtMentionDetailsForComment(comment);
      const cleanName = escapeHtml(baseNotificationMessage.actor.name);
      return {
        ...baseNotificationMessage,
        attachments: [{ text: comment.text, url: deepLink, mentions }],
        html: `${span(
          cleanName,
          'user-name'
        )} commented on your task ${htmlLink}`,
        imageUrl: design ? findImageUrl(design) : null,
        link: deepLink,
        location: getLocation({ collection, design }),
        title: `${cleanName} commented on your task ${normalizeTitle(task)}`
      };
    }

    case NotificationType.TASK_COMMENT_MENTION: {
      const { designId, collectionId, taskId } = notification;
      const design = await getDesign(designId);
      const collection = await getCollection(collectionId);
      const task = await getTask(taskId);
      if (!design || !task) {
        return null;
      }
      const { htmlLink, deepLink } = getLinks({
        collection,
        design,
        task,
        type: LinkType.CollectionDesignTask
      });
      const comment: Comment | null = await CommentsDAO.findById(
        notification.commentId
      );
      if (!comment) {
        return null;
      }
      const { mentions } = await addAtMentionDetailsForComment(comment);
      const cleanName = escapeHtml(baseNotificationMessage.actor.name);
      return {
        ...baseNotificationMessage,
        attachments: [{ text: comment.text, url: deepLink, mentions }],
        html: `${span(
          cleanName,
          'user-name'
        )} mentioned you on the task ${htmlLink}`,
        imageUrl: design ? findImageUrl(design) : null,
        link: deepLink,
        location: getLocation({ collection, design }),
        title: `${cleanName} mentioned you on the task ${normalizeTitle(task)}`
      };
    }

    case NotificationType.TASK_ASSIGNMENT: {
      const { designId, collectionId, taskId } = notification;
      const design = await getDesign(designId);
      const collection = await getCollection(collectionId);
      const task = await getTask(taskId);
      if (!design || !task) {
        return null;
      }
      const { htmlLink, deepLink } = getLinks({
        collection,
        design,
        task,
        type: LinkType.CollectionDesignTask
      });
      const cleanName = escapeHtml(baseNotificationMessage.actor.name);
      return {
        ...baseNotificationMessage,
        attachments: [],
        html: `${span(
          cleanName,
          'user-name'
        )} assigned you the task ${htmlLink}`,
        imageUrl: design ? findImageUrl(design) : null,
        link: deepLink,
        location: getLocation({ collection, design }),
        title: `${cleanName} assigned you the task ${normalizeTitle(task)}`
      };
    }

    case NotificationType.TASK_COMPLETION: {
      const { designId, collectionId, taskId } = notification;
      const design = await getDesign(designId);
      const collection = await getCollection(collectionId);
      const task = await getTask(taskId);
      if (!design || !task) {
        return null;
      }
      const { htmlLink, deepLink } = getLinks({
        collection,
        design,
        task,
        type: LinkType.CollectionDesignTask
      });
      const cleanName = escapeHtml(baseNotificationMessage.actor.name);
      return {
        ...baseNotificationMessage,
        attachments: [],
        html: `${span(cleanName, 'user-name')} completed the task ${htmlLink}`,
        imageUrl: design ? findImageUrl(design) : null,
        link: deepLink,
        location: getLocation({ collection, design }),
        title: `${cleanName} completed the task ${normalizeTitle(task)}`
      };
    }

    case NotificationType.PARTNER_ACCEPT_SERVICE_BID: {
      const { designId } = notification;
      const design = await getDesign(designId);
      if (!design) {
        return null;
      }
      const collectionId =
        (design.collectionIds && design.collectionIds[0]) || null;
      const collection = await getCollection(collectionId);
      const { htmlLink, deepLink } = getLinks({
        design,
        type: LinkType.Design
      });
      const cleanName = escapeHtml(baseNotificationMessage.actor.name);
      return {
        ...baseNotificationMessage,
        attachments: [],
        html: `${span(
          cleanName,
          'user-name'
        )} accepted the service bid for ${htmlLink}`,
        imageUrl: null,
        link: deepLink,
        location: getLocation({ collection, design }),
        title: `${cleanName} accepted the service bid for ${normalizeTitle(
          design
        )}`
      };
    }

    case NotificationType.PARTNER_DESIGN_BID: {
      const { designId } = notification;
      const design = await getDesign(designId);
      if (!design) {
        return null;
      }
      const { deepLink } = getLinks({
        design,
        type: LinkType.PartnerDesign
      });
      return {
        ...baseNotificationMessage,
        attachments: [],
        html: `You have a <a href="${deepLink}">new project</a> to review`,
        imageUrl: null,
        link: deepLink,
        location: getLocation({ collection: null, design }),
        title: 'You have a new project to review'
      };
    }

    case NotificationType.PARTNER_REJECT_SERVICE_BID: {
      const { designId } = notification;
      const design = await getDesign(designId);
      if (!design) {
        return null;
      }
      const collectionId =
        (design.collectionIds && design.collectionIds[0]) || null;
      const collection = await getCollection(collectionId);
      const { htmlLink, deepLink } = getLinks({
        design,
        type: LinkType.Design
      });
      const cleanName = escapeHtml(baseNotificationMessage.actor.name);
      return {
        ...baseNotificationMessage,
        attachments: [],
        html: `${span(
          cleanName,
          'user-name'
        )} rejected the service bid for ${htmlLink}`,
        imageUrl: null,
        link: deepLink,
        location: getLocation({ collection, design }),
        title: `${cleanName} rejected the service bid for ${normalizeTitle(
          design
        )}`
      };
    }

    case NotificationType.PARTNER_PAIRING_COMMITTED: {
      const { collectionId } = notification;
      const collection = await getCollection(collectionId);
      if (!collection) {
        return null;
      }
      const { htmlLink, deepLink } = getLinks({
        collection,
        type: LinkType.Collection
      });
      return {
        ...baseNotificationMessage,
        attachments: [],
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
      const collection = await getCollection(collectionId);
      if (!collection) {
        return null;
      }
      const { htmlLink, deepLink } = getLinks({
        collection,
        type: LinkType.Collection
      });
      return {
        ...baseNotificationMessage,
        attachments: [],
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
      const collection = await getCollection(collectionId);
      if (!collection) {
        return null;
      }
      const { htmlLink, deepLink } = getLinks({
        collection,
        isCheckout: true,
        type: LinkType.Collection
      });
      return {
        ...baseNotificationMessage,
        attachments: [],
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
      const collection = await getCollection(collectionId);
      if (!collection) {
        return null;
      }
      const { htmlLink, deepLink } = getLinks({
        collection,
        isSubmit: true,
        type: LinkType.Collection
      });
      return {
        ...baseNotificationMessage,
        attachments: [],
        html: `${htmlLink} pricing has expired. Please resubmit for updated costing.`,
        imageUrl: null,
        link: deepLink,
        location: [],
        title: `Pricing for ${normalizeTitle(collection)} has expired.`
      };
    }

    case NotificationType.COSTING_EXPIRATION_TWO_DAYS: {
      const { collectionId } = notification;
      const collection = await getCollection(collectionId);
      if (!collection) {
        return null;
      }
      const { htmlLink, deepLink } = getLinks({
        collection,
        isCheckout: true,
        type: LinkType.Collection
      });
      return {
        ...baseNotificationMessage,
        attachments: [],
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
      const collection = await getCollection(collectionId);
      if (!collection) {
        return null;
      }
      const { htmlLink, deepLink } = getLinks({
        collection,
        isCheckout: true,
        type: LinkType.Collection
      });
      return {
        ...baseNotificationMessage,
        attachments: [],
        html: `${htmlLink} pricing expires in 7 days.`,
        imageUrl: null,
        link: deepLink,
        location: [],
        title: `Pricing for ${normalizeTitle(
          collection
        )} will expire in 7 days.`
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
};
