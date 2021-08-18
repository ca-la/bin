import {
  GraphQLEndpoint,
  GraphQLContextAuthenticated,
  requireAuth,
  Middleware,
  NotFoundError,
  UserInputError,
  ForbiddenError,
} from "../../apollo";
import { NotificationFilter, NotificationMessageForGraphQL } from "./types";
import * as NotificationsDAO from "./dao";
import * as GraphQLTypes from "./graphql-types";
import { createNotificationMessage } from "./notification-messages";
import { transformNotificationMessageToGraphQL } from "./service";
import { Notification } from "./domain-object";

interface GetNotificationsArgs {
  limit: number;
  offset: number;
  filter: NotificationFilter;
}

type GetNotificationsResult = NotificationMessageForGraphQL[];

const notificationMessages: GraphQLEndpoint<
  GetNotificationsArgs,
  GetNotificationsResult,
  GraphQLContextAuthenticated<GetNotificationsResult>
> = {
  endpointType: "Query",
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
  middleware: requireAuth as Middleware<
    GetNotificationsArgs,
    GraphQLContextAuthenticated<GetNotificationsResult>,
    GetNotificationsResult
  >,
  resolver: async (
    _: unknown,
    args: GetNotificationsArgs,
    context: GraphQLContextAuthenticated<GetNotificationsResult>
  ) => {
    const { limit, offset, filter } = args;
    const { trx, session } = context;
    const { userId } = session;

    if ((limit && limit < 0) || (offset && offset < 0)) {
      throw new UserInputError("Offset / Limit cannot be negative!");
    }

    const notifications = await NotificationsDAO.findByUserId(trx, userId, {
      limit: limit || 20,
      offset: offset || 0,
      filter,
    });

    const messages: NotificationMessageForGraphQL[] = [];
    for (const notification of notifications) {
      const maybeMessage = await createNotificationMessage(notification);
      if (maybeMessage) {
        messages.push(transformNotificationMessageToGraphQL(maybeMessage));
      }
    }
    return messages;
  },
};

interface UnreadNotificationsArgs {}
type UnreadNotificationsResult = {
  [key in NotificationFilter]: number;
};

const unreadNotificationsCount: GraphQLEndpoint<
  UnreadNotificationsArgs,
  UnreadNotificationsResult,
  GraphQLContextAuthenticated<UnreadNotificationsResult>
> = {
  endpointType: "Query",
  types: [GraphQLTypes.UnreadCounts],
  name: "unreadNotificationsCount",
  signature: ": UnreadCounts!",
  middleware: requireAuth as Middleware<
    UnreadNotificationsArgs,
    GraphQLContextAuthenticated<UnreadNotificationsResult>,
    UnreadNotificationsResult
  >,
  resolver: async (
    _: unknown,
    _args: UnreadNotificationsArgs,
    context: GraphQLContextAuthenticated<UnreadNotificationsResult>
  ) => {
    const { trx, session } = context;
    const { userId } = session;

    const unreadCount = NotificationsDAO.findUnreadCountByFiltersByUserId(
      trx,
      userId
    );

    return unreadCount;
  },
};

interface ArchiveNotificationsArgs {
  id: string;
  inboxOnly: boolean;
}

const archiveNotifications: GraphQLEndpoint<
  ArchiveNotificationsArgs,
  number,
  GraphQLContextAuthenticated<number>
> = {
  endpointType: "Mutation",
  name: "archiveNotifications",
  signature: "(id: String!, inboxOnly: Boolean = false): Int!",
  middleware: requireAuth,
  resolver: async (
    _: any,
    args: ArchiveNotificationsArgs,
    context: GraphQLContextAuthenticated<number>
  ) => {
    const { id, inboxOnly } = args;
    const {
      trx,
      session: { userId },
    } = context;
    if (!id) {
      throw new UserInputError(
        "You must indicate the last archived notification"
      );
    }

    return await NotificationsDAO.archiveOlderThan(trx, {
      notificationId: id,
      recipientUserId: userId,
      onlyArchiveInbox: inboxOnly,
    });
  },
};

interface UpdateNotificationArgs {
  id: string;
  archivedAt: Date | null;
}

const updateNotification: GraphQLEndpoint<
  UpdateNotificationArgs,
  NotificationMessageForGraphQL,
  GraphQLContextAuthenticated<NotificationMessageForGraphQL>
> = {
  endpointType: "Mutation",
  name: "updateNotification",
  signature: "(id: String!, archivedAt: GraphQLDateTime): NotificationMessage!",
  middleware: requireAuth,
  resolver: async (
    _: unknown,
    args: UpdateNotificationArgs,
    context: GraphQLContextAuthenticated<NotificationMessageForGraphQL>
  ) => {
    const { id, archivedAt } = args;
    const {
      trx,
      session: { userId },
    } = context;

    const notification = await NotificationsDAO.findById(trx, id);
    if (!notification) {
      throw new NotFoundError("Notification not found");
    }
    if (notification.recipientUserId !== userId) {
      throw new ForbiddenError("Access denied for this resource");
    }

    await NotificationsDAO.update(trx, id, {
      archivedAt,
      ...(archivedAt && !notification.readAt ? { readAt: new Date() } : {}),
    });

    const updated = await NotificationsDAO.findById(trx, id);
    if (!updated) {
      throw new Error("Updated notification not found");
    }
    const message = await createNotificationMessage(updated);
    if (!message) {
      throw new Error("Updated a notification that cannot be displayed");
    }
    return transformNotificationMessageToGraphQL(message);
  },
};

interface ReadNotificationsArgs {
  ids: string[];
}

interface ReadNotification {
  id: string;
  readAt: Date | null;
}

const readNotifications: GraphQLEndpoint<
  ReadNotificationsArgs,
  ReadNotification[],
  GraphQLContextAuthenticated<ReadNotification[]>
> = {
  endpointType: "Mutation",
  name: "readNotifications",
  signature: "(ids: [String]!): [NotificationMessage]!",
  middleware: requireAuth,
  resolver: async (
    _: unknown,
    args: ReadNotificationsArgs,
    context: GraphQLContextAuthenticated<ReadNotification[]>
  ) => {
    const { ids } = args;
    const {
      trx,
      session: { userId },
    } = context;

    const notifications = await NotificationsDAO.markRead(ids, trx);

    const read = notifications.map((notification: Notification) => {
      if (
        !notification ||
        (notification.recipientUserId !== null &&
          notification.recipientUserId !== userId)
      ) {
        throw new ForbiddenError("Access denied for this resource");
      }
      return { id: notification.id, readAt: notification.readAt };
    });

    return read;
  },
};

export const NotificationEndpoints = [
  notificationMessages,
  archiveNotifications,
  updateNotification,
  readNotifications,
  unreadNotificationsCount,
];
