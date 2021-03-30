import { Transaction } from "knex";
import uuid from "node-uuid";
import {
  BaseNotification,
  StrictNotification,
  templateNotification,
  RowKeyMapping,
} from "../../components/notifications/models/base";
import {
  Notification,
  NotificationType,
} from "../../components/notifications/domain-object";
import { NotificationMessageBuilder } from "../../components/notifications/notification-messages";
import { replaceNotifications } from "../create-notifications";

export interface Recipient {
  recipientUserId: string | null;
  recipientCollaboratorId: string | null;
  recipientTeamUserId: string | null;
}

export type AllNotificationKeys = keyof BaseNotification;
export type NotificationKeys = Exclude<
  keyof BaseNotification,
  "recipientUserId" | "recipientCollaboratorId" | "type"
>;

export type CalaNotification<
  type extends NotificationType,
  RequiredFields extends NotificationKeys = never,
  OptionalFields extends NotificationKeys = never
> = Omit<
  BaseNotification,
  | RequiredFields
  | OptionalFields
  | "recipientUserId"
  | "recipientCollaboratorId"
  | "type"
> &
  Pick<StrictNotification, RequiredFields> &
  {
    [key in OptionalFields]: BaseNotification[key] | StrictNotification[key];
  } & { type: type; createdAt: Date } & Recipient;

export type CalaNotificationArgument<
  type extends NotificationType,
  RequiredFields extends NotificationKeys,
  OptionalFields extends NotificationKeys
> = Pick<
  CalaNotification<type, RequiredFields, OptionalFields>,
  RequiredFields | OptionalFields
>;

interface NotificationSchema {
  required?: NotificationKeys;
  optional?: NotificationKeys;
}

export type NotificationsLayerSchema = Partial<
  Record<NotificationType, NotificationSchema>
>;

export type NotificationsLayer<LS extends NotificationsLayerSchema> = {
  [type in keyof LS]: NotificationComponent<
    Extract<type, NotificationType>,
    Extract<LS[type], NotificationSchema>["required"] extends string
      ? Extract<LS[type], NotificationSchema>["required"]
      : never,
    Extract<LS[type], NotificationSchema>["optional"] extends string
      ? Extract<LS[type], NotificationSchema>["optional"]
      : never
  >;
};

export interface NotificationComponent<
  type extends NotificationType,
  RequiredFields extends NotificationKeys = never,
  OptionalFields extends NotificationKeys = never
> {
  notificationSample?: CalaNotification<type, RequiredFields, OptionalFields>;
  notificationRowSample?: {
    [key in keyof RowKeyMapping]: CalaNotification<
      type,
      RequiredFields,
      OptionalFields
    >[Extract<
      RowKeyMapping[key],
      keyof CalaNotification<type, RequiredFields, OptionalFields>
    >];
  };
  type: type;
  send: (
    trx: Transaction,
    actorUserId: string,
    recipient: Recipient,
    data: CalaNotificationArgument<type, RequiredFields, OptionalFields>
  ) => Promise<Notification | void>;
  messageBuilder: NotificationMessageBuilder;
}

export const buildNotificationComponent = <
  type extends NotificationType,
  RequiredFields extends NotificationKeys = never,
  OptionalFields extends NotificationKeys = never
>(
  type: type,
  messageBuilder: NotificationMessageBuilder
): NotificationComponent<type, RequiredFields, OptionalFields> => {
  return {
    type,
    messageBuilder,
    send: async (
      trx: Transaction,
      actorUserId: string,
      recipient: Recipient,
      data: CalaNotificationArgument<type, RequiredFields, OptionalFields>
    ): Promise<Notification | void> => {
      if (recipient.recipientUserId === actorUserId) {
        return;
      }
      return replaceNotifications({
        trx,
        notification: {
          id: uuid.v4(),
          type,
          actorUserId,
          ...templateNotification,
          ...data,
          ...recipient,
        },
      });
    },
  };
};
