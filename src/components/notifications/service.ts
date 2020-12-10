import { toPairs } from "lodash";
import {
  NotificationMessage,
  NotificationMessageAttachment,
  NotificationMessageForGraphQL,
  NotificationMessageAttachmentForGraphQL,
} from "./types";

function transformAttachmentToGraphQL(
  attachment: NotificationMessageAttachment
): NotificationMessageAttachmentForGraphQL {
  return {
    ...attachment,
    mentions: attachment.mentions
      ? toPairs(attachment.mentions).map(
          (pair: [string, string | undefined]) => ({
            id: pair[0],
            name: pair[1],
          })
        )
      : undefined,
  };
}

export function transformNotificationMessageToGraphQL(
  notificationMessage: NotificationMessage
): NotificationMessageForGraphQL {
  return {
    ...notificationMessage,
    attachments: notificationMessage.attachments.map(
      transformAttachmentToGraphQL
    ),
  };
}
