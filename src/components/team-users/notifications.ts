import {
  FullNotification,
  NotificationType,
} from "../notifications/domain-object";
import {
  buildNotificationComponent,
  NotificationsLayer,
} from "../../services/cala-component/cala-notifications";
import {
  span,
  getTeamBaseWithAssets,
} from "../notifications/notification-messages";

import {
  BaseFullNotification,
  BaseNotification,
} from "../notifications/models/base";

type BaseFull = Omit<BaseNotification, "teamId"> &
  Omit<BaseFullNotification, "teamTitle">;

export interface FullInviteTeamUserNotification extends BaseFull {
  teamId: string;
  teamTitle: string;
  type: NotificationType.INVITE_TEAM_USER;
}

export interface NotificationLayerSchema {
  [NotificationType.INVITE_TEAM_USER]: {
    required: "teamId";
  };
}

const layer: NotificationsLayer<NotificationLayerSchema> = {
  INVITE_TEAM_USER: buildNotificationComponent<
    NotificationType.INVITE_TEAM_USER,
    NotificationLayerSchema[NotificationType.INVITE_TEAM_USER]["required"]
  >(
    NotificationType.INVITE_TEAM_USER,
    async (notification: FullNotification) => {
      const assets = getTeamBaseWithAssets(notification);
      if (!assets) {
        return null;
      }

      return {
        ...assets.base,
        html: `${span(assets.actorName, "user-name")} invited you to ${
          assets.teamHtmlLink
        }`,
        title: `${assets.actorName} invited you to ${notification.teamTitle}`,
        text: `Invited you to ${notification.teamTitle}`,
      };
    }
  ),
};
export default layer;
