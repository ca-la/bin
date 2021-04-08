import {
  GraphQLEndpoint,
  GraphQLContextAuthenticated,
  requireAuth,
  Middleware,
  NotFoundError,
  UserInputError,
  ForbiddenError,
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
import { FullNotification } from "./domain-object";

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
    const messages: (NotificationMessage | null)[] = await Promise.all(
      notifications.map((n: FullNotification) => createNotificationMessage(n))
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

const archiveNotifications: GraphQLEndpoint<
  ArchiveNotificationsArgs,
  number,
  GraphQLContextAuthenticated<number>
> = {
  endpointType: "MUTATION",
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

const updateNotificaion: GraphQLEndpoint<
  UpdateNotificationArgs,
  NotificationMessageForGraphQL,
  GraphQLContextAuthenticated<NotificationMessageForGraphQL>
> = {
  endpointType: "MUTATION",
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

    await NotificationsDAO.update(trx, id, { archivedAt });

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

export const NotificationEndpoints = [
  notificationMessages,
  archiveNotifications,
  updateNotificaion,
];
