import Knex from "knex";

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
  getNonUserInvitationMessage,
} from "../notifications/notification-messages";

import {
  BaseFullNotification,
  BaseNotification,
} from "../notifications/models/base";
import db from "../../services/db";
import { TeamUsersDAO } from ".";
import normalizeTitle from "../../services/normalize-title";

type BaseFull = Omit<BaseNotification, "teamId" | "recipientTeamUserId"> &
  Omit<BaseFullNotification, "teamTitle">;

export interface FullInviteTeamUserNotification extends BaseFull {
  recipientTeamUserId: string;
  teamId: string;
  teamTitle: string;
  type: NotificationType.INVITE_TEAM_USER;
}

export interface NotificationLayerSchema {
  [NotificationType.INVITE_TEAM_USER]: {
    required: "teamId" | "recipientTeamUserId";
  };
}

const layer: NotificationsLayer<NotificationLayerSchema> = {
  INVITE_TEAM_USER: buildNotificationComponent<
    NotificationType.INVITE_TEAM_USER,
    NotificationLayerSchema[NotificationType.INVITE_TEAM_USER]["required"]
  >(
    NotificationType.INVITE_TEAM_USER,
    async (notification: FullNotification, trx?: Knex) => {
      const { recipientTeamUserId, teamTitle } = notification;
      const assets = getTeamBaseWithAssets(notification);
      if (!assets) {
        return null;
      }
      const teamUser = recipientTeamUserId
        ? await TeamUsersDAO.findById(trx || db, recipientTeamUserId)
        : null;
      if (!teamUser) {
        return null;
      }

      const partialMessage = {
        title: `${assets.actorName} invited you to ${notification.teamTitle}`,
        text: `Invited you to ${notification.teamTitle}`,
      };

      if (!teamUser.userId) {
        const { html, link } = await getNonUserInvitationMessage({
          notification,
          invitationEmail: teamUser.userEmail,
          escapedActorName: assets.actorName,
          resourceName: normalizeTitle({ title: teamTitle }),
        });

        return {
          ...assets.base,
          ...partialMessage,
          html,
          link,
        };
      }

      return {
        ...assets.base,
        ...partialMessage,
        html: `${span(assets.actorName, "user-name")} invited you to ${
          assets.teamHtmlLink
        }`,
      };
    }
  ),
};
export default layer;
