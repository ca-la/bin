import { z } from "zod";
import { buildChannelName } from "../iris/build-channel";
import {
  NotificationMessage,
  serializedNotificationMessageSchema,
} from "./types";

export const realtimeNotificationCreatedSchema = z.object({
  resource: serializedNotificationMessageSchema,
  type: z.literal("notification/created"),
  channels: z.tuple([z.string()]),
});

export type RealtimeNotificationCreated = z.infer<
  typeof realtimeNotificationCreatedSchema
>;

export function realtimeNotificationCreated(
  recipientUserId: string,
  notificationMessage: NotificationMessage
): RealtimeNotificationCreated {
  return {
    type: "notification/created",
    resource: notificationMessage,
    channels: [buildChannelName("updates", recipientUserId)],
  };
}
