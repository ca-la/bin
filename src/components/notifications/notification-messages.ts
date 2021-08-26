import Knex from "knex";
import { escape as escapeOptionalHtml } from "lodash";

import InvalidDataError from "../../errors/invalid-data";
import * as CommentsDAO from "../../components/comments/dao";
import * as PlansDAO from "../../components/plans/dao";
import * as CollaboratorsDAO from "../../components/collaborators/dao";

import {
  DEPRECATED_NOTIFICATION_TYPES,
  FullNotification,
  NotificationType,
} from "./domain-object";
import getLinks, { constructHtmlLink, LinkType } from "./get-links";
import normalizeTitle from "../../services/normalize-title";
import Comment from "../../components/comments/types";
import { ComponentType } from "../components/types";
import { getMentionsFromComment } from "../../services/add-at-mention-details";
import {
  buildImgixLink,
  generatePreviewLinks,
  THUMBNAIL_FORMAT,
  PREVIEW_CARD_FORMAT,
  EMAIL_PREVIEW_FORMAT,
} from "../../services/attach-asset-links";
import User from "../../components/users/domain-object";
import {
  BreadCrumb,
  NotificationMessage,
  NotificationMessageActionType,
} from "./types";
import { getMatchingFilters } from "../../services/get-matching-filters";
import db from "../../services/db";
import { logServerError } from "../../services/logger";

const messageBuilders: Partial<Record<
  NotificationType,
  NotificationMessageBuilder
>> = {};

export type NotificationMessageBuilder = (
  notification: FullNotification
) => Promise<NotificationMessage | null>;

export function registerMessageBuilder(
  type: NotificationType,
  builder: NotificationMessageBuilder
): void {
  messageBuilders[type] = builder;
}

export function span(text: string, className?: string): string {
  return `<span class='${className}'>${text}</span>`;
}

export function buildImageUrl(imageIds: string[]): string | null {
  const imageLinks = generatePreviewLinks(imageIds);

  return imageLinks.length > 0 ? imageLinks[0].thumbnailLink : null;
}

function buildCommentNotificationImageUrls(
  imageIds: string[]
): {
  imageUrl: string | null;
  previewImageUrl: string | null;
  emailPreviewImageUrl: string | null;
} {
  const imageLinks = generatePreviewLinks(imageIds);

  return {
    imageUrl: imageLinks.length > 0 ? imageLinks[0].thumbnailLink : null,
    previewImageUrl: imageLinks.length > 0 ? imageLinks[0].previewLink : null,
    emailPreviewImageUrl:
      imageIds.length > 0
        ? buildImgixLink(imageIds[0], EMAIL_PREVIEW_FORMAT)
        : null,
  };
}

export function escapeHtml(html?: string | null): string {
  return escapeOptionalHtml(html || "");
}

export function getLocation({
  collection,
  design,
}: {
  collection: { title: string | null; id: string } | null;
  design: { title: string | null; id: string } | null;
}): BreadCrumb[] {
  const location = [];
  if (collection) {
    const { deepLink: collectionLink } = getLinks({
      collection,
      type: LinkType.Collection,
    });
    location.push({ text: normalizeTitle(collection), url: collectionLink });
  }
  if (design) {
    const { deepLink: designLink } = getLinks({
      design,
      type: LinkType.Design,
    });
    location.push({ text: normalizeTitle(design), url: designLink });
  }
  return location;
}

type BaseMessage = Pick<
  NotificationMessage,
  | "actions"
  | "attachments"
  | "createdAt"
  | "id"
  | "readAt"
  | "archivedAt"
  | "matchedFilters"
  | "type"
  | "previewImageUrl"
  | "emailPreviewImageUrl"
> & {
  actor: User;
};

export function createBaseMessage(notification: FullNotification): BaseMessage {
  return {
    actions: [],
    actor: notification.actor,
    attachments: [],
    createdAt: notification.createdAt,
    id: notification.id,
    readAt: notification.readAt,
    archivedAt: notification.archivedAt,
    matchedFilters: getMatchingFilters(notification),
    type: notification.type,
    previewImageUrl: null,
    emailPreviewImageUrl: null,
  };
}

interface ApprovalBaseWithAssets {
  base: Omit<NotificationMessage, "html" | "title" | "text">;
  actorName: string;
  designHtmlLink: string;
  stepHtmlLink: string;
  submissionHtmlLink: string;
}

export function getApprovalBaseWithAssets(
  notification: FullNotification
): ApprovalBaseWithAssets | null {
  const {
    designId,
    designTitle,
    designImageIds,
    collectionId,
    collectionTitle,
    approvalStepId,
    approvalStepTitle,
    approvalSubmissionId,
    approvalSubmissionTitle,
    type,
  } = notification;

  if (!approvalStepId || !designId) {
    return null;
  }

  const design = { id: designId, title: designTitle };
  const collection = collectionId
    ? {
        id: collectionId,
        title: collectionTitle,
      }
    : null;
  const approvalStep = {
    id: approvalStepId,
    title: approvalStepTitle,
  };
  const approvalSubmission = {
    id: approvalSubmissionId,
    title: approvalSubmissionTitle,
  };

  const { deepLink } = getLinks({
    design,
    approvalStep,
    type: LinkType.ApprovalStep,
  });
  const designHtmlLink = constructHtmlLink(deepLink, normalizeTitle(design));
  const stepHtmlLink = constructHtmlLink(
    deepLink,
    normalizeTitle(approvalStep)
  );
  const submissionHtmlLink = constructHtmlLink(
    deepLink,
    normalizeTitle(approvalSubmission)
  );
  const baseMessage = createBaseMessage(notification);
  const actorName = escapeHtml(
    baseMessage.actor.name || baseMessage.actor.email
  );

  return {
    base: {
      ...baseMessage,
      imageUrl: buildImageUrl(designImageIds),
      link: deepLink,
      location: getLocation({ collection, design }),
      type,
    },
    actorName,
    designHtmlLink,
    stepHtmlLink,
    submissionHtmlLink,
  };
}

interface TeamBaseWithAssets {
  base: Omit<NotificationMessage, "html" | "title" | "text">;
  actorName: string;
  teamHtmlLink: string;
}

export function getTeamBaseWithAssets(
  notification: FullNotification
): TeamBaseWithAssets | null {
  const { teamId, type, teamTitle } = notification;

  if (!teamId) {
    return null;
  }

  const team = {
    id: teamId,
    title: teamTitle,
  };

  const { deepLink } = getLinks({
    team,
    type: LinkType.Team,
  });

  const teamHtmlLink = constructHtmlLink(deepLink, normalizeTitle(team));

  const baseMessage = createBaseMessage(notification);
  const actorName = escapeHtml(
    baseMessage.actor.name || baseMessage.actor.email
  );
  const location: BreadCrumb[] = [
    { text: normalizeTitle(team), url: deepLink },
  ];

  return {
    base: {
      ...baseMessage,
      imageUrl: null,
      link: deepLink,
      location,
      type,
    },
    actorName,
    teamHtmlLink,
  };
}

export async function getNonUserInvitationMessage(options: {
  notification: FullNotification;
  invitationEmail: string | null;
  escapedActorName: string;
  resourceName: string;
}): Promise<{
  html: string;
  link: string;
}> {
  const {
    escapedActorName,
    invitationEmail,
    notification,
    resourceName,
  } = options;

  if (!invitationEmail) {
    throw new Error(
      `Notification ${notification.id} is missing both recipientUserId and an email`
    );
  }

  const plan = await db.transaction((trx: Knex.Transaction) =>
    PlansDAO.findFreeAndDefaultForTeams(trx)
  );

  if (!plan) {
    throw new Error("No free default plan found");
  }

  const { htmlLink, deepLink } = getLinks({
    type: LinkType.Subscribe,
    returnToDesignId: notification.designId,
    returnToCollectionId: notification.collectionId,
    returnToTeamId: notification.teamId,
    planId: plan.id,
    invitationEmail,
    title: resourceName,
  });

  return {
    html: `${span(escapedActorName, "user-name")} invited you to ${
      notification.designId || notification.collectionId
        ? "collaborate on "
        : ""
    }${htmlLink}`,
    link: deepLink,
  };
}

export async function createNotificationMessage(
  notification: FullNotification
): Promise<NotificationMessage | null | undefined> {
  if (DEPRECATED_NOTIFICATION_TYPES.includes(notification.type)) {
    return null;
  }
  if (Object.keys(messageBuilders).length === 0) {
    logServerError("The messageBuilders variable has not been initialized");
  }

  const builder = messageBuilders[notification.type as NotificationType];
  if (builder) {
    return builder(notification);
  }

  const baseNotificationMessage = createBaseMessage(notification);

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
            id: notification.collectionId,
          }
        : null;
      const resourceName = normalizeTitle({
        title: notification.designTitle || notification.collectionTitle,
      });
      const cleanName = escapeHtml(notification.actor.name);
      const partialMessage = {
        ...baseNotificationMessage,
        imageUrl: buildImageUrl(notification.designImageIds),
        location: getLocation({
          collection: collectionMeta,
          design: designMeta,
        }),
        title: `${cleanName} invited you to collaborate on ${resourceName}`,
        text: `Invited you to collaborate on ${resourceName}`,
      };

      if (!notification.recipientUserId) {
        const collaborator = await CollaboratorsDAO.findById(
          notification.collaboratorId
        );

        if (!collaborator) {
          throw new Error(
            `Collaborator ${notification.collaboratorId} not found`
          );
        }

        // Invitation notifications may have:
        //   1. a recipientUserId (for notifications directly to a auser)
        //   2. a collaborator.userId (for accepted invitations)
        //   3. a collaborator.userEmail (for un-accepted invitations)
        // (3) should receive a "subscribe" link, (1) and (2) should receive a
        //   link directly to the resource they're invited to.
        if (!collaborator.userId) {
          const { html, link } = await getNonUserInvitationMessage({
            notification,
            invitationEmail: collaborator.userEmail,
            escapedActorName: cleanName,
            resourceName,
          });

          return {
            ...partialMessage,
            html,
            link,
          };
        }
      }

      if (collectionMeta) {
        const { htmlLink, deepLink } = getLinks({
          collection: collectionMeta,
          type: LinkType.Collection,
        });

        return {
          ...partialMessage,
          html: `${span(
            cleanName,
            "user-name"
          )} invited you to collaborate on ${htmlLink}`,
          link: deepLink,
        };
      }

      if (designMeta) {
        const { htmlLink, deepLink } = getLinks({
          design: designMeta,
          type: LinkType.Design,
        });

        return {
          ...partialMessage,
          html: `${span(
            cleanName,
            "user-name"
          )} invited you to collaborate on ${htmlLink}`,
          link: deepLink,
        };
      }

      return null;
    }

    case NotificationType.ANNOTATION_COMMENT_CREATE: {
      const {
        annotationId,
        annotationImageId,
        annotationImagePageNumber,
        canvasId,
        designId,
        collectionId,
        commentId,
        commentText,
        hasAttachments,
        componentType,
      } = notification;
      const design = { id: designId, title: notification.designTitle };
      const collection = collectionId
        ? { id: collectionId, title: notification.collectionTitle }
        : null;
      const mentions = await db.transaction((trx: Knex.Transaction) =>
        getMentionsFromComment(trx, commentText)
      );
      const cleanName = escapeHtml(baseNotificationMessage.actor.name);
      const { deepLink, htmlLink } = getLinks({
        annotationId,
        canvasId,
        componentType: componentType as ComponentType,
        design,
        commentId,
        type: LinkType.DesignAnnotation,
      });
      return {
        ...baseNotificationMessage,
        actions: [
          {
            type: NotificationMessageActionType.ANNOTATION_COMMENT_REPLY,
            annotationId,
            parentCommentId: commentId,
            commentId,
            designId,
          },
        ],
        attachments: [
          { text: commentText, url: deepLink, mentions, hasAttachments },
        ],
        html: `${span(cleanName, "user-name")} commented on ${htmlLink}`,
        imageUrl: annotationImageId
          ? buildImgixLink(annotationImageId, {
              ...THUMBNAIL_FORMAT,
              pageNumber: annotationImagePageNumber,
            })
          : null,
        previewImageUrl: annotationImageId
          ? buildImgixLink(annotationImageId, {
              ...PREVIEW_CARD_FORMAT,
              pageNumber: annotationImagePageNumber,
            })
          : null,
        emailPreviewImageUrl: annotationImageId
          ? buildImgixLink(annotationImageId, {
              ...EMAIL_PREVIEW_FORMAT,
              pageNumber: annotationImagePageNumber,
            })
          : null,
        link: deepLink,
        location: getLocation({ collection, design }),
        title: `${cleanName} commented on ${normalizeTitle(design)}`,
        text: `Commented on ${normalizeTitle(design)}`,
      };
    }

    case NotificationType.ANNOTATION_COMMENT_MENTION: {
      const {
        annotationId,
        annotationImageId,
        annotationImagePageNumber,
        canvasId,
        designId,
        collectionId,
        commentId,
        commentText,
        hasAttachments,
        componentType,
        parentCommentId,
      } = notification;
      const design = { id: designId, title: notification.designTitle };
      const collection = collectionId
        ? { id: collectionId, title: notification.collectionTitle }
        : null;
      const mentions = await db.transaction((trx: Knex.Transaction) =>
        getMentionsFromComment(trx, commentText)
      );
      const cleanName = escapeHtml(baseNotificationMessage.actor.name);
      const { deepLink, htmlLink } = getLinks({
        annotationId,
        canvasId,
        componentType: componentType as ComponentType,
        design,
        commentId,
        type: LinkType.DesignAnnotation,
      });
      return {
        ...baseNotificationMessage,
        actions: [
          {
            type: NotificationMessageActionType.ANNOTATION_COMMENT_REPLY,
            annotationId,
            parentCommentId: parentCommentId || commentId,
            commentId,
            designId,
          },
        ],
        attachments: [
          { text: commentText, url: deepLink, mentions, hasAttachments },
        ],
        html: `${span(cleanName, "user-name")} mentioned you on ${htmlLink}`,
        imageUrl: annotationImageId
          ? buildImgixLink(annotationImageId, {
              ...THUMBNAIL_FORMAT,
              pageNumber: annotationImagePageNumber,
            })
          : null,
        previewImageUrl: annotationImageId
          ? buildImgixLink(annotationImageId, {
              ...PREVIEW_CARD_FORMAT,
              pageNumber: annotationImagePageNumber,
            })
          : null,
        emailPreviewImageUrl: annotationImageId
          ? buildImgixLink(annotationImageId, {
              ...EMAIL_PREVIEW_FORMAT,
              pageNumber: annotationImagePageNumber,
            })
          : null,
        link: deepLink,
        location: getLocation({ collection, design }),
        title: `${cleanName} mentioned you on ${normalizeTitle(design)}`,
        text: `Mentioned you on ${normalizeTitle(design)}`,
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
        componentType,
        parentCommentId,
      } = notification;
      const design = { id: designId, title: notification.designTitle };
      const collection = collectionId
        ? { id: collectionId, title: notification.collectionTitle }
        : null;
      const mentions = await db.transaction((trx: Knex.Transaction) =>
        getMentionsFromComment(trx, commentText)
      );
      const cleanName = escapeHtml(baseNotificationMessage.actor.name);
      const { deepLink, htmlLink } = getLinks({
        annotationId,
        canvasId,
        componentType: componentType as ComponentType,
        design,
        commentId,
        type: LinkType.DesignAnnotation,
      });
      return {
        ...baseNotificationMessage,
        actions: [
          {
            type: NotificationMessageActionType.ANNOTATION_COMMENT_REPLY,
            annotationId,
            parentCommentId: parentCommentId || commentId,
            commentId,
            designId,
          },
        ],
        attachments: [
          { text: commentText, url: deepLink, mentions, hasAttachments },
        ],
        html: `${span(
          cleanName,
          "user-name"
        )} has replied to a comment on ${htmlLink}`,
        ...buildCommentNotificationImageUrls(designImageIds),
        link: deepLink,
        location: getLocation({ collection, design }),
        title: `${cleanName} has replied to a comment on ${normalizeTitle(
          design
        )}`,
        text: `Replied to a comment on ${normalizeTitle(design)}`,
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
        type: LinkType.Design,
      });
      const cleanName = escapeHtml(baseNotificationMessage.actor.name);
      return {
        ...baseNotificationMessage,
        html: `${span(
          cleanName,
          "user-name"
        )} added a measurement to ${htmlLink}`,
        imageUrl: buildImageUrl(designImageIds),
        link: deepLink,
        location: getLocation({ collection, design }),
        title: `${cleanName} added a measurement to ${normalizeTitle(design)}`,
        text: `Added a measurement to ${normalizeTitle(design)}`,
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
        hasAttachments,
        parentCommentId,
      } = notification;
      const design = { id: designId, title: notification.designTitle };
      const collection = collectionId
        ? { id: collectionId, title: notification.collectionTitle }
        : null;
      const task = { id: taskId, title: notification.taskTitle };
      const { htmlLink, deepLink } = getLinks({
        collection,
        design,
        task,
        commentId,
        type: LinkType.CollectionDesignTask,
      });
      const comment: Comment | null = await CommentsDAO.findById(commentId);
      if (!comment) {
        return null;
      }
      const mentions = await db.transaction((trx: Knex.Transaction) =>
        getMentionsFromComment(trx, commentText)
      );
      const cleanName = escapeHtml(baseNotificationMessage.actor.name);
      return {
        ...baseNotificationMessage,
        actions: [
          {
            type: NotificationMessageActionType.TASK_COMMENT_REPLY,
            taskId,
            parentCommentId: parentCommentId || commentId,
            commentId,
            designId,
          },
        ],
        attachments: [
          { text: comment.text, url: deepLink, mentions, hasAttachments },
        ],
        html: `${span(
          cleanName,
          "user-name"
        )} commented on your task ${htmlLink}`,
        ...buildCommentNotificationImageUrls(designImageIds),
        link: deepLink,
        location: getLocation({ collection, design }),
        title: `${cleanName} commented on your task ${normalizeTitle(task)}`,
        text: `Commented on your task ${normalizeTitle(task)}`,
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
        hasAttachments,
        parentCommentId,
      } = notification;
      const design = { id: designId, title: notification.designTitle };
      const collection = collectionId
        ? { id: collectionId, title: notification.collectionTitle }
        : null;
      const task = { id: taskId, title: notification.taskTitle };
      const { htmlLink, deepLink } = getLinks({
        collection,
        design,
        task,
        commentId,
        type: LinkType.CollectionDesignTask,
      });
      const mentions = await db.transaction((trx: Knex.Transaction) =>
        getMentionsFromComment(trx, commentText)
      );
      const cleanName = escapeHtml(baseNotificationMessage.actor.name);
      return {
        ...baseNotificationMessage,
        actions: [
          {
            type: NotificationMessageActionType.TASK_COMMENT_REPLY,
            taskId,
            parentCommentId: parentCommentId || commentId,
            commentId,
            designId,
          },
        ],
        attachments: [
          { text: commentText, url: deepLink, mentions, hasAttachments },
        ],
        html: `${span(
          cleanName,
          "user-name"
        )} mentioned you on the task ${htmlLink}`,
        ...buildCommentNotificationImageUrls(designImageIds),
        link: deepLink,
        location: getLocation({ collection, design }),
        title: `${cleanName} mentioned you on the task ${normalizeTitle(task)}`,
        text: `Mentioned you on the task ${normalizeTitle(task)}`,
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
        hasAttachments,
        parentCommentId,
      } = notification;
      const design = { id: designId, title: notification.designTitle };
      const collection = collectionId
        ? { id: collectionId, title: notification.collectionTitle }
        : null;
      const task = { id: taskId, title: notification.taskTitle };
      const { htmlLink, deepLink } = getLinks({
        collection,
        design,
        task,
        commentId,
        type: LinkType.CollectionDesignTask,
      });
      const mentions = await db.transaction((trx: Knex.Transaction) =>
        getMentionsFromComment(trx, commentText)
      );
      const cleanName = escapeHtml(baseNotificationMessage.actor.name);
      return {
        ...baseNotificationMessage,
        actions: [
          {
            type: NotificationMessageActionType.TASK_COMMENT_REPLY,
            taskId,
            parentCommentId: parentCommentId || commentId,
            commentId,
            designId,
          },
        ],
        attachments: [
          { text: commentText, url: deepLink, mentions, hasAttachments },
        ],
        html: `${span(
          cleanName,
          "user-name"
        )} has replied to a comment on ${htmlLink}`,
        ...buildCommentNotificationImageUrls(designImageIds),
        link: deepLink,
        location: getLocation({ collection, design }),
        title: `${cleanName} has replied to a comment on ${normalizeTitle(
          task
        )}`,
        text: `Replied to a comment on ${normalizeTitle(task)}`,
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
        type: LinkType.CollectionDesignTask,
      });
      const cleanName = escapeHtml(baseNotificationMessage.actor.name);
      return {
        ...baseNotificationMessage,
        html: `${span(
          cleanName,
          "user-name"
        )} assigned you the task ${htmlLink}`,
        imageUrl: buildImageUrl(designImageIds),
        link: deepLink,
        location: getLocation({ collection, design }),
        title: `${cleanName} assigned you the task ${normalizeTitle(task)}`,
        text: `Assigned you the task ${normalizeTitle(task)}`,
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
        type: LinkType.CollectionDesignTask,
      });
      const cleanName = escapeHtml(baseNotificationMessage.actor.name);
      return {
        ...baseNotificationMessage,
        html: `${span(cleanName, "user-name")} completed the task ${htmlLink}`,
        imageUrl: buildImageUrl(designImageIds),
        link: deepLink,
        location: getLocation({ collection, design }),
        title: `${cleanName} completed the task ${normalizeTitle(task)}`,
        text: `Completed the task ${normalizeTitle(task)}`,
      };
    }

    case NotificationType.PARTNER_ACCEPT_SERVICE_BID: {
      const { designId } = notification;
      const design = { id: designId, title: notification.designTitle };
      const { htmlLink, deepLink } = getLinks({
        design,
        type: LinkType.Design,
      });
      const cleanName = escapeHtml(baseNotificationMessage.actor.name);
      return {
        ...baseNotificationMessage,
        html: `${span(
          cleanName,
          "user-name"
        )} accepted the service bid for ${htmlLink}`,
        imageUrl: null,
        link: deepLink,
        location: getLocation({ collection: null, design }),
        title: `${cleanName} accepted the service bid for ${normalizeTitle(
          design
        )}`,
        text: `Accepted the service bid for ${normalizeTitle(design)}`,
      };
    }

    case NotificationType.PARTNER_DESIGN_BID: {
      const { designId } = notification;
      const design = { id: designId, title: notification.designTitle };
      const { deepLink } = getLinks({
        design,
        type: LinkType.PartnerDesign,
      });
      return {
        ...baseNotificationMessage,
        html: `You have a <a href="${deepLink}">new project</a> to review`,
        imageUrl: null,
        link: deepLink,
        location: getLocation({ collection: null, design }),
        title: "You have a new project to review",
        text: "You have a new project to review",
      };
    }

    case NotificationType.PARTNER_REJECT_SERVICE_BID: {
      const { designId } = notification;
      const design = { id: designId, title: notification.designTitle };
      const { htmlLink, deepLink } = getLinks({
        design,
        type: LinkType.Design,
      });
      const cleanName = escapeHtml(baseNotificationMessage.actor.name);
      return {
        ...baseNotificationMessage,
        html: `${span(
          cleanName,
          "user-name"
        )} rejected the service bid for ${htmlLink}`,
        imageUrl: null,
        link: deepLink,
        location: getLocation({ collection: null, design }),
        title: `${cleanName} rejected the service bid for ${normalizeTitle(
          design
        )}`,
        text: `Rejected the service bid for ${normalizeTitle(design)}`,
      };
    }

    case NotificationType.COLLECTION_SUBMIT: {
      const { collectionId } = notification;
      const collection = {
        id: collectionId,
        title: notification.collectionTitle,
      };
      if (!collection) {
        return null;
      }
      const { htmlLink, deepLink } = getLinks({
        collection,
        type: LinkType.Collection,
      });
      return {
        ...baseNotificationMessage,
        html: `${htmlLink} has been submitted, and will be reviewed by our team`,
        imageUrl: null,
        link: deepLink,
        location: [],
        title: `${normalizeTitle(
          collection
        )} has been submitted, and will be reviewed by our team`,
        text: `${normalizeTitle(
          collection
        )} has been submitted, and will be reviewed by our team`,
      };
    }

    case NotificationType.COMMIT_COST_INPUTS: {
      const { collectionId } = notification;
      const collection = {
        id: collectionId,
        title: notification.collectionTitle,
      };
      const { htmlLink, deepLink } = getLinks({
        collection,
        isCheckout: true,
        type: LinkType.Collection,
      });
      return {
        ...baseNotificationMessage,
        html: `${htmlLink} has been reviewed and is now ready for checkout`,
        imageUrl: null,
        link: deepLink,
        location: [],
        title: `${normalizeTitle(
          collection
        )} has been reviewed and is now ready for checkout`,
        text: `${normalizeTitle(
          collection
        )} has been reviewed and is now ready for checkout`,
      };
    }

    case NotificationType.REJECT_COLLECTION: {
      const { collectionId } = notification;
      const collection = {
        id: collectionId,
        title: notification.collectionTitle,
      };
      const { htmlLink, deepLink } = getLinks({
        collection,
        type: LinkType.Collection,
      });
      return {
        ...baseNotificationMessage,
        html: `CALA has requested more information in order to cost ${htmlLink}`,
        imageUrl: null,
        link: deepLink,
        location: [],
        title: `CALA has requested more information in order to cost ${normalizeTitle(
          collection
        )}`,
        text: `CALA has requested more information in order to cost ${normalizeTitle(
          collection
        )}`,
      };
    }

    case NotificationType.COSTING_EXPIRED: {
      const { collectionId } = notification;
      const collection = {
        id: collectionId,
        title: notification.collectionTitle,
      };
      const { htmlLink, deepLink } = getLinks({
        collection,
        isSubmit: true,
        type: LinkType.Collection,
      });
      return {
        ...baseNotificationMessage,
        html: `${htmlLink} pricing has expired. Please resubmit for updated costing.`,
        imageUrl: null,
        link: deepLink,
        location: [],
        title: `Pricing for ${normalizeTitle(collection)} has expired`,
        text: `Pricing for ${normalizeTitle(collection)} has expired`,
      };
    }

    case NotificationType.COSTING_EXPIRATION_TWO_DAYS: {
      const { collectionId } = notification;
      const collection = {
        id: collectionId,
        title: notification.collectionTitle,
      };
      const { htmlLink, deepLink } = getLinks({
        collection,
        isCheckout: true,
        type: LinkType.Collection,
      });
      return {
        ...baseNotificationMessage,
        html: `${htmlLink} pricing expires in 48 hours`,
        imageUrl: null,
        link: deepLink,
        location: [],
        title: `Pricing for ${normalizeTitle(
          collection
        )} will expire in 48 hours`,
        text: `Pricing for ${normalizeTitle(
          collection
        )} will expire in 48 hours`,
      };
    }

    case NotificationType.COSTING_EXPIRATION_ONE_WEEK: {
      const { collectionId } = notification;
      const collection = {
        id: collectionId,
        title: notification.collectionTitle,
      };
      const { htmlLink, deepLink } = getLinks({
        collection,
        isCheckout: true,
        type: LinkType.Collection,
      });
      return {
        ...baseNotificationMessage,
        html: `${htmlLink} pricing expires in 7 days`,
        imageUrl: null,
        link: deepLink,
        location: [],
        title: `Pricing for ${normalizeTitle(
          collection
        )} will expire in 7 days`,
        text: `Pricing for ${normalizeTitle(collection)} will expire in 7 days`,
      };
    }

    case NotificationType.APPROVAL_STEP_COMMENT_MENTION: {
      const {
        designId,
        designImageIds,
        collectionId,
        commentId,
        commentText,
        hasAttachments,
        parentCommentId,
      } = notification;

      if (!collectionId) {
        return null;
      }

      const design = { id: designId, title: notification.designTitle };
      const collection = {
        id: collectionId,
        title: notification.collectionTitle,
      };
      const approvalStep = {
        id: notification.approvalStepId,
        title: notification.approvalStepTitle,
      };

      const { htmlLink: stepHtmlLink, deepLink } = getLinks({
        design,
        approvalStep,
        commentId,
        type: LinkType.ApprovalStep,
      });
      const designHtmlLink = constructHtmlLink(
        deepLink,
        normalizeTitle(design)
      );
      const mentions = await db.transaction((trx: Knex.Transaction) =>
        getMentionsFromComment(trx, commentText)
      );
      const cleanName = escapeHtml(baseNotificationMessage.actor.name);
      return {
        ...baseNotificationMessage,
        actions: [
          {
            type: NotificationMessageActionType.APPROVAL_STEP_COMMENT_REPLY,
            approvalStepId: notification.approvalStepId,
            parentCommentId: parentCommentId || commentId,
            commentId,
            designId,
          },
        ],
        attachments: [
          { text: commentText, url: deepLink, mentions, hasAttachments },
        ],
        html: `${span(
          cleanName,
          "user-name"
        )} mentioned you on ${stepHtmlLink} for ${designHtmlLink}`,
        ...buildCommentNotificationImageUrls(designImageIds),
        link: deepLink,
        location: getLocation({ collection, design }),
        title: `${cleanName} mentioned you on ${normalizeTitle(
          approvalStep
        )} for ${normalizeTitle(design)}`,
        text: `Mentioned you on ${normalizeTitle(
          approvalStep
        )} for ${normalizeTitle(design)}`,
      };
    }

    case NotificationType.APPROVAL_STEP_COMMENT_REPLY: {
      const {
        designId,
        designImageIds,
        collectionId,
        commentId,
        commentText,
        hasAttachments,
        parentCommentId,
      } = notification;

      if (!collectionId) {
        return null;
      }

      const design = { id: designId, title: notification.designTitle };
      const collection = {
        id: collectionId,
        title: notification.collectionTitle,
      };
      const approvalStep = {
        id: notification.approvalStepId,
        title: notification.approvalStepTitle,
      };

      const { htmlLink: stepHtmlLink, deepLink } = getLinks({
        design,
        approvalStep,
        commentId,
        type: LinkType.ApprovalStep,
      });
      const designHtmlLink = constructHtmlLink(
        deepLink,
        normalizeTitle(design)
      );
      const mentions = await db.transaction((trx: Knex.Transaction) =>
        getMentionsFromComment(trx, commentText)
      );
      const cleanName = escapeHtml(baseNotificationMessage.actor.name);
      return {
        ...baseNotificationMessage,
        actions: [
          {
            type: NotificationMessageActionType.APPROVAL_STEP_COMMENT_REPLY,
            approvalStepId: notification.approvalStepId,
            parentCommentId: parentCommentId || commentId,
            commentId,
            designId,
          },
        ],
        attachments: [
          { text: commentText, url: deepLink, mentions, hasAttachments },
        ],
        html: `${span(
          cleanName,
          "user-name"
        )} replied to a comment on ${stepHtmlLink} for ${designHtmlLink}`,
        ...buildCommentNotificationImageUrls(designImageIds),
        link: deepLink,
        location: getLocation({ collection, design }),
        title: `${cleanName} replied to a comment on ${normalizeTitle(
          approvalStep
        )} for ${normalizeTitle(design)}`,
        text: `Replied to a comment on ${normalizeTitle(
          approvalStep
        )} for ${normalizeTitle(design)}`,
      };
    }

    case NotificationType.APPROVAL_STEP_COMMENT_CREATE: {
      const {
        designId,
        designImageIds,
        collectionId,
        commentId,
        commentText,
        hasAttachments,
        parentCommentId,
      } = notification;

      if (!collectionId) {
        return null;
      }

      const design = { id: designId, title: notification.designTitle };
      const collection = {
        id: collectionId,
        title: notification.collectionTitle,
      };
      const approvalStep = {
        id: notification.approvalStepId,
        title: notification.approvalStepTitle,
      };

      const { htmlLink: stepHtmlLink, deepLink } = getLinks({
        design,
        approvalStep,
        commentId,
        type: LinkType.ApprovalStep,
      });
      const designHtmlLink = constructHtmlLink(
        deepLink,
        normalizeTitle(design)
      );
      const mentions = await db.transaction((trx: Knex.Transaction) =>
        getMentionsFromComment(trx, commentText)
      );
      const cleanName = escapeHtml(baseNotificationMessage.actor.name);
      return {
        ...baseNotificationMessage,
        actions: [
          {
            type: NotificationMessageActionType.APPROVAL_STEP_COMMENT_REPLY,
            approvalStepId: notification.approvalStepId,
            parentCommentId: parentCommentId || commentId,
            commentId,
            designId,
          },
        ],
        attachments: [
          { text: commentText, url: deepLink, mentions, hasAttachments },
        ],
        html: `${span(
          cleanName,
          "user-name"
        )} commented on ${stepHtmlLink} for ${designHtmlLink}`,
        ...buildCommentNotificationImageUrls(designImageIds),
        link: deepLink,
        location: getLocation({ collection, design }),
        title: `${cleanName} commented on ${normalizeTitle(
          approvalStep
        )} for ${normalizeTitle(design)}`,
        text: `Commented on ${normalizeTitle(
          approvalStep
        )} for ${normalizeTitle(design)}`,
      };
    }

    case NotificationType.APPROVAL_STEP_SUBMISSION_COMMENT_CREATE: {
      const {
        designId,
        designTitle,
        designImageIds,
        collectionId,
        collectionTitle,
        approvalStepId,
        approvalStepTitle,
        approvalSubmissionId,
        approvalSubmissionTitle,
        commentId,
        commentText,
        hasAttachments,
        parentCommentId,
      } = notification;

      if (!collectionId) {
        return null;
      }

      const design = { id: designId, title: designTitle };
      const collection = {
        id: collectionId,
        title: collectionTitle,
      };
      const approvalStep = {
        id: approvalStepId,
        title: approvalStepTitle,
      };
      const approvalSubmission = {
        id: approvalSubmissionId,
        title: approvalSubmissionTitle,
      };

      const { deepLink, htmlLink: submissionHtmlLink } = getLinks({
        design,
        approvalStep,
        approvalSubmission,
        commentId,
        type: LinkType.ApprovalStepSubmission,
      });
      const designHtmlLink = constructHtmlLink(
        deepLink,
        normalizeTitle(design)
      );

      const mentions = await db.transaction((trx: Knex.Transaction) =>
        getMentionsFromComment(trx, commentText)
      );
      const cleanName = escapeHtml(baseNotificationMessage.actor.name);
      return {
        ...baseNotificationMessage,
        actions: [
          {
            type:
              NotificationMessageActionType.APPROVAL_STEP_SUBMISSION_COMMENT_REPLY,
            approvalStepId,
            approvalSubmissionId,
            parentCommentId: parentCommentId || commentId,
            commentId,
            designId,
          },
        ],
        attachments: [
          { text: commentText, url: deepLink, mentions, hasAttachments },
        ],
        html: `${span(
          cleanName,
          "user-name"
        )} commented on review ${submissionHtmlLink} for ${designHtmlLink} (${escapeHtml(
          normalizeTitle(approvalStep)
        )})`,
        ...buildCommentNotificationImageUrls(designImageIds),
        link: deepLink,
        location: getLocation({ collection, design }),
        title: `${cleanName} commented on review ${normalizeTitle(
          approvalSubmission
        )} for ${normalizeTitle(design)} (${normalizeTitle(approvalStep)})`,
        text: `Commented on review ${normalizeTitle(
          approvalSubmission
        )} for ${normalizeTitle(design)} (${normalizeTitle(approvalStep)})`,
      };
    }

    case NotificationType.APPROVAL_STEP_SUBMISSION_COMMENT_MENTION: {
      const {
        designId,
        designTitle,
        designImageIds,
        collectionId,
        collectionTitle,
        commentId,
        commentText,
        hasAttachments,
        parentCommentId,
        approvalStepId,
        approvalStepTitle,
        approvalSubmissionId,
        approvalSubmissionTitle,
      } = notification;

      if (!collectionId) {
        return null;
      }

      const design = { id: designId, title: designTitle };
      const collection = {
        id: collectionId,
        title: collectionTitle,
      };
      const approvalStep = {
        id: approvalStepId,
        title: approvalStepTitle,
      };
      const approvalSubmission = {
        id: approvalSubmissionId,
        title: approvalSubmissionTitle,
      };

      const { deepLink, htmlLink: submissionHtmlLink } = getLinks({
        design,
        approvalStep,
        approvalSubmission,
        commentId,
        type: LinkType.ApprovalStepSubmission,
      });
      const designHtmlLink = constructHtmlLink(
        deepLink,
        normalizeTitle(design)
      );

      const mentions = await db.transaction((trx: Knex.Transaction) =>
        getMentionsFromComment(trx, commentText)
      );
      const cleanName = escapeHtml(baseNotificationMessage.actor.name);
      return {
        ...baseNotificationMessage,
        actions: [
          {
            type:
              NotificationMessageActionType.APPROVAL_STEP_SUBMISSION_COMMENT_REPLY,
            parentCommentId: parentCommentId || commentId,
            commentId,
            designId,
            approvalStepId,
            approvalSubmissionId,
          },
        ],
        attachments: [
          { text: commentText, url: deepLink, mentions, hasAttachments },
        ],
        html: `${span(
          cleanName,
          "user-name"
        )} mentioned you on review ${submissionHtmlLink} for ${designHtmlLink} (${escapeHtml(
          normalizeTitle(approvalStep)
        )})`,
        ...buildCommentNotificationImageUrls(designImageIds),
        link: deepLink,
        location: getLocation({ collection, design }),
        title: `${cleanName} mentioned you on review ${normalizeTitle(
          approvalSubmission
        )} for ${normalizeTitle(design)} (${normalizeTitle(approvalStep)})`,
        text: `Mentioned you on review ${normalizeTitle(
          approvalSubmission
        )} for ${normalizeTitle(design)} (${normalizeTitle(approvalStep)})`,
      };
    }

    case NotificationType.APPROVAL_STEP_SUBMISSION_COMMENT_REPLY: {
      const {
        designId,
        designTitle,
        designImageIds,
        collectionId,
        collectionTitle,
        commentId,
        commentText,
        hasAttachments,
        parentCommentId,
        approvalStepId,
        approvalStepTitle,
        approvalSubmissionId,
        approvalSubmissionTitle,
      } = notification;

      if (!collectionId) {
        return null;
      }

      const design = { id: designId, title: designTitle };
      const collection = {
        id: collectionId,
        title: collectionTitle,
      };
      const approvalStep = {
        id: approvalStepId,
        title: approvalStepTitle,
      };
      const approvalSubmission = {
        id: approvalSubmissionId,
        title: approvalSubmissionTitle,
      };

      const { deepLink, htmlLink: submissionHtmlLink } = getLinks({
        design,
        approvalStep,
        approvalSubmission,
        commentId,
        type: LinkType.ApprovalStepSubmission,
      });
      const designHtmlLink = constructHtmlLink(
        deepLink,
        normalizeTitle(design)
      );

      const mentions = await db.transaction((trx: Knex.Transaction) =>
        getMentionsFromComment(trx, commentText)
      );
      const cleanName = escapeHtml(baseNotificationMessage.actor.name);
      return {
        ...baseNotificationMessage,
        actions: [
          {
            type:
              NotificationMessageActionType.APPROVAL_STEP_SUBMISSION_COMMENT_REPLY,
            approvalStepId,
            approvalSubmissionId,
            parentCommentId: parentCommentId || commentId,
            commentId,
            designId,
          },
        ],
        attachments: [
          { text: commentText, url: deepLink, mentions, hasAttachments },
        ],
        html: `${span(
          cleanName,
          "user-name"
        )} replied to a comment on review ${submissionHtmlLink} for ${designHtmlLink} (${escapeHtml(
          normalizeTitle(approvalStep)
        )})`,
        ...buildCommentNotificationImageUrls(designImageIds),
        link: deepLink,
        location: getLocation({ collection, design }),
        title: `${cleanName} replied to a comment on review ${normalizeTitle(
          approvalSubmission
        )} for ${normalizeTitle(design)} (${normalizeTitle(approvalStep)})`,
        text: `Replied to a comment on review ${normalizeTitle(
          approvalSubmission
        )} for ${normalizeTitle(design)} (${normalizeTitle(approvalStep)})`,
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
