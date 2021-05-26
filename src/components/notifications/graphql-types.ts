import * as NotificationTypes from "../notifications/types";
import { GraphQLType } from "../../apollo/published-types/published-types";

export const BreadCrumb: GraphQLType = {
  name: "BreadCrumb",
  type: "type",
  body: {
    text: "String!",
    url: "String!",
  },
};

export const Mention: GraphQLType = {
  name: "Mention",
  type: "type",
  body: {
    id: "String!",
    name: "String",
  },
};

export const NotificationMessageAttachment: GraphQLType = {
  name: "NotificationMessageAttachment",
  type: "type",
  body: {
    text: "String!",
    url: "String!",
    mentions: "[Mention]",
    hasAttachments: "Boolean",
  },
  requires: ["Mention"],
};

export const NotificationMessageActionType: GraphQLType = {
  name: "NotificationMessageActionType",
  type: "enum",
  body: [
    NotificationTypes.NotificationMessageActionType.ANNOTATION_COMMENT_REPLY,
    NotificationTypes.NotificationMessageActionType.TASK_COMMENT_REPLY,
    NotificationTypes.NotificationMessageActionType.APPROVAL_STEP_COMMENT_REPLY,
  ].join("\n  "),
};

export const NotificationMessageAction: GraphQLType = {
  name: "NotificationMessageAction",
  type: "type",
  body: {
    type: "NotificationMessageActionType!",
    parentCommentId: "String",
    designId: "String",
    taskId: "String",
    annotationId: "String",
    approvalStepId: "String",
  },
  requires: ["NotificationMessageActionType"],
};

export const NotificationFilter: GraphQLType = {
  name: "NotificationFilter",
  type: "enum",
  body: [
    NotificationTypes.NotificationFilter.UNARCHIVED,
    NotificationTypes.NotificationFilter.ARCHIVED,
    NotificationTypes.NotificationFilter.INBOX,
  ].join("\n  "),
};

export const NotificationMessage: GraphQLType = {
  name: "NotificationMessage",
  type: "type",
  body: {
    type: "String!",
    id: "String!",
    title: "String!",
    html: "String!",
    text: "String!",
    readAt: "GraphQLDateTime",
    link: "String!",
    createdAt: "GraphQLDateTime!",
    actor: "User",
    imageUrl: "String",
    location: "[BreadCrumb]!",
    attachments: "[NotificationMessageAttachment]!",
    actions: "[NotificationMessageAction]!",
    archivedAt: "GraphQLDateTime",
    matchedFilters: "[NotificationFilter]!",
  },
  requires: [
    "User",
    "BreadCrumb",
    "NotificationMessageAttachment",
    "NotificationMessageAction",
    "NotificationFilter",
  ],
};
