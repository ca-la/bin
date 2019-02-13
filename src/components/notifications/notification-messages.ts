import { Notification, NotificationMessage, NotificationType } from './domain-object';
import ProductDesign = require('../../domain-objects/product-design');
import * as UsersDAO from '../../dao/users';
import * as ProductDesignsDAO from '../../dao/product-designs';
import * as CollectionsDAO from '../../dao/collections';
import Collection from '../../domain-objects/collection';
import { STUDIO_HOST } from '../../config/index';
import getTitle from '../../services/get-title';
import { logWarning } from '../../services/logger';

function getDeepLink(
  design: ProductDesign | null,
  collection: Collection | null
): { deepLink: string, htmlLink: string } {
  if (design) {
    const deepLink = `${STUDIO_HOST}/designs/${design.id}`;
    const title = getTitle(design, null);
    return {
      deepLink,
      htmlLink: constructHtmlLink(deepLink, title)
    };
  }
  if (collection) {
    const deepLink = `${STUDIO_HOST}/collections/${collection.id}`;
    const title = getTitle(null, collection);
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
    ${title}
  </a>
  `;
}

function findImageUrl(design: ProductDesign): string | null {
  if (design.imageLinks && design.imageLinks.length > 0) {
    return design.imageLinks[0].thumbnailLink;
  }
  return null;
}

export const createNotificationMessage = async (
  notification: Notification
): Promise<NotificationMessage> => {
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
      const { deepLink, htmlLink } = getDeepLink(design, collection);
      return {
        ...baseNotificationMessage,
        attachments: [],
        html: `${baseNotificationMessage.actor.name} invited you to collaborate on ${htmlLink}.`,
        imageUrl: design ? findImageUrl(design) : null,
        location: [{ text: getTitle(design, collection), url: deepLink }]
      };
    }

    case (NotificationType.DESIGN_UPDATE): {
      const design = notification.designId
        ? await ProductDesignsDAO.findById(notification.designId)
        : null;
      const { deepLink, htmlLink } = getDeepLink(design, null);
      return {
        ...baseNotificationMessage,
        attachments: [],
        html: `${baseNotificationMessage.actor.name} updated ${htmlLink}.`,
        imageUrl: design ? findImageUrl(design) : null,
        location: [{ text: getTitle(design, null), url: deepLink }]
      };
    }

    case (NotificationType.COMMIT_COST_INPUTS): {
      const collection = notification.collectionId
        ? await CollectionsDAO.findById(notification.collectionId)
        : null;
      const { deepLink, htmlLink } = getDeepLink(null, collection);
      return {
        ...baseNotificationMessage,
        attachments: [],
        html: `${htmlLink} has been reviewed and is now ready for checkout.`,
        imageUrl: null,
        location: [{ text: getTitle(null, collection), url: deepLink }]
      };
    }

    default: {
      logWarning(
        `Notification found with unparsable type ${notification.type} and id ${notification.id}`);
      return {
        ...baseNotificationMessage,
        attachments: [],
        html: '',
        imageUrl: null,
        location: []
      };
    }
  }
};
