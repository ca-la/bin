import {
  GraphQLEndpoint,
  GraphQLContextAuthenticated,
  requireAuth,
} from "../../apollo";
import {
  NotificationFilter,
  NotificationMessage,
  NotificationMessageForGraphQL,
} from "./types";
import * as NotificationsDAO from "./dao";
import * as GraphQLTypes from "./graphql-types";
import { createNotificationMessage } from "./notification-messages";
import { transformNotificationMessageToGraphQL } from "./service";

interface GetNotificationsArgs {
  limit: number;
  offset: number;
  filter: NotificationFilter;
}

const notificationMessages: GraphQLEndpoint<
  GetNotificationsArgs,
  NotificationMessageForGraphQL[],
  GraphQLContextAuthenticated
> = {
  endpointType: "QUERY",
  types: [
    GraphQLTypes.BreadCrumb,
    GraphQLTypes.Mention,
    GraphQLTypes.NotificationMessageAttachment,
    GraphQLTypes.NotificationMessageActionType,
    GraphQLTypes.NotificationMessageAction,
    GraphQLTypes.NotificationFilter,
    GraphQLTypes.NotificationMessage,
  ],
  name: "notificationMessages",
  signature:
    "(limit: Int = 20, offset: Int = 20, filter: NotificationFilter): [NotificationMessage]",
  middleware: requireAuth,
  resolver: async (
    _: any,
    args: GetNotificationsArgs,
    context: GraphQLContextAuthenticated
  ) => {
    const { limit, offset, filter } = args;
    const { trx, session } = context;
    const { userId } = session;

    if ((limit && limit < 0) || (offset && offset < 0)) {
      throw new Error("Offset / Limit cannot be negative!");
    }

    const notifications = await NotificationsDAO.findByUserId(trx, userId, {
      limit: limit || 20,
      offset: offset || 0,
      filter,
    });
    const messages: (NotificationMessage | null)[] = await Promise.all(
      notifications.map(createNotificationMessage)
    );

    return (messages.filter(
      (message: NotificationMessage | null) => message !== null
    ) as NotificationMessage[]).map(transformNotificationMessageToGraphQL);
  },
};

interface ArchiveNotificationsArgs {
  id: string;
  inboxOnly: boolean;
}

const archiveNotification: GraphQLEndpoint<
  ArchiveNotificationsArgs,
  number,
  GraphQLContextAuthenticated
> = {
  endpointType: "MUTATION",
  name: "archiveNotification",
  signature: "(id: String!, inboxOnly: Boolean = false): Int!",
  middleware: requireAuth,
  resolver: async (
    _: any,
    args: ArchiveNotificationsArgs,
    context: GraphQLContextAuthenticated
  ) => {
    const { id, inboxOnly } = args;
    const {
      trx,
      session: { userId },
    } = context;
    if (!id) {
      throw new Error("You must indicate the last archived notification");
    }

    return await NotificationsDAO.archiveOlderThan(trx, {
      notificationId: id,
      recipientUserId: userId,
      onlyArchiveInbox: inboxOnly,
    });
  },
};

export const NotificationEndpoints = [
  notificationMessages,
  archiveNotification,
];
