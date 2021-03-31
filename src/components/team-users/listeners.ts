import * as Knex from "knex";
import {
  Listeners,
  buildListeners,
} from "../../services/cala-component/cala-listeners";
import { TeamUser, teamUserDomain } from "./types";
import {
  RouteCreated,
  RouteUpdated,
  RouteDeleted,
} from "../../services/pubsub/cala-events";
import { realtimeTeamUsersListUpdated } from "./realtime";
import TeamUsersDAO from "./dao";
import * as IrisService from "../../components/iris/send-message";
import notifications from "./notifications";
import { NotificationType } from "../notifications/types";
import { immediatelySendInviteTeamUser } from "../../services/create-notifications";

async function sendTeamUsersListUpdatedMessage(
  trx: Knex.Transaction,
  teamId: string
) {
  const teamUsersList = await TeamUsersDAO.find(trx, { teamId });

  IrisService.sendMessage(realtimeTeamUsersListUpdated(teamId, teamUsersList));
}

export const listeners: Listeners<TeamUser, typeof teamUserDomain> = {
  "route.created": async (
    event: RouteCreated<TeamUser, typeof teamUserDomain>
  ) => {
    const {
      trx,
      created: { id, teamId, userId },
      actorId,
    } = event;

    const notification = await notifications[
      NotificationType.INVITE_TEAM_USER
    ].send(
      trx,
      actorId,
      {
        recipientUserId: userId,
        recipientCollaboratorId: null,
        recipientTeamUserId: id,
      },
      {
        teamId,
        recipientTeamUserId: id,
      }
    );
    if (notification) {
      await immediatelySendInviteTeamUser(trx, notification);
    }
    await sendTeamUsersListUpdatedMessage(trx, teamId);
  },
  "route.updated": async (
    event: RouteUpdated<TeamUser, typeof teamUserDomain>
  ) => {
    const {
      trx,
      updated: { teamId },
    } = event;

    await sendTeamUsersListUpdatedMessage(trx, teamId);
  },
  "route.deleted": async (
    event: RouteDeleted<TeamUser, typeof teamUserDomain>
  ) => {
    const {
      trx,
      deleted: { teamId },
    } = event;

    await sendTeamUsersListUpdatedMessage(trx, teamId);
  },
};

export default buildListeners<TeamUser, typeof teamUserDomain>(
  teamUserDomain,
  listeners
);
