import { Transaction } from "knex";
import uuid from "node-uuid";
import {
  BaseNotification,
  StrictNotification,
  templateNotification,
  RowKeyMapping,
} from "../../components/notifications/models/base";
import { NotificationType } from "../../components/notifications/domain-object";
import { NotificationMessageBuilder } from "../../components/notifications/notification-messages";
import { replaceNotifications } from "../create-notifications";

export type CalaNotificationRecipient =
  | {
      recipientUserId: string;
      recipientCollaboratorId: string;
    }
  | {
      recipientUserId: null;
      recipientCollaboratorId: string;
    }
  | {
      recipientUserId: string;
      recipientCollaboratorId: null;
    };

export type AllNotificationKeys = keyof BaseNotification;
export type NotificationKeys = Exclude<
  keyof BaseNotification,
  "recipientUserId" | "recipientCollaboratorId" | "type"
>;

export type CalaNotification<
  type extends NotificationType,
  RequiredFields extends NotificationKeys,
  OptionalFields extends NotificationKeys
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
  } & { type: type; createdAt: Date } & CalaNotificationRecipient;

export type CalaNotificationArgument<
  type extends NotificationType,
  RequiredFields extends NotificationKeys,
  OptionalFields extends NotificationKeys
> = Pick<
  CalaNotification<type, RequiredFields, OptionalFields>,
  RequiredFields | OptionalFields
>;

interface NotificationSchema {
  required: NotificationKeys;
  optional: NotificationKeys;
}

export type NotificationsLayerSchema = Partial<
  Record<NotificationType, NotificationSchema>
>;

export type NotificationsLayer<LS extends NotificationsLayerSchema> = {
  [type in keyof LS]: NotificationComponent<
    Extract<type, NotificationType>,
    Extract<LS[type], NotificationSchema>["required"],
    Extract<LS[type], NotificationSchema>["optional"]
  >;
};

export interface NotificationComponent<
  type extends NotificationType,
  RequiredFields extends NotificationKeys,
  OptionalFields extends NotificationKeys
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
    recipient: CalaNotificationRecipient,
    data: CalaNotificationArgument<type, RequiredFields, OptionalFields>
  ) => Promise<void>;
  messageBuilder: NotificationMessageBuilder;
}

export const buildNotificationComponent = <
  type extends NotificationType,
  RequiredFields extends NotificationKeys,
  OptionalFields extends NotificationKeys = Exclude<
    NotificationKeys,
    NotificationKeys
  >
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
      recipient: CalaNotificationRecipient,
      data: CalaNotificationArgument<type, RequiredFields, OptionalFields>
    ): Promise<void> => {
      if (recipient.recipientUserId === actorUserId) {
        return;
      }
      await replaceNotifications({
        trx,
        notification: {
          id: uuid.v4(),
          type,
          actorUserId,
          ...templateNotification,
          ...recipient,
          ...data,
        },
      });
    },
  };
};