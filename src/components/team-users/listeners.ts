import * as Knex from "knex";
import {
  Listeners,
  buildListeners,
} from "../../services/cala-component/cala-listeners";
import { TeamUser, TeamUserDb, teamUserDomain } from "./types";
import {
  RouteCreated,
  RouteUpdated,
  RouteDeleted,
} from "../../services/pubsub/cala-events";
import { realtimeTeamInvited, realtimeTeamUsersListUpdated } from "./realtime";
import TeamUsersDAO from "./dao";
import { withTeamUserMetaDao as TeamsDAO } from "../teams/dao";
import * as IrisService from "../../components/iris/send-message";
import notifications from "./notifications";
import { NotificationType } from "../notifications/types";
import { immediatelySendInviteTeamUser } from "../../services/create-notifications";
import ResourceNotFoundError from "../../errors/resource-not-found";

async function sendTeamUsersListUpdatedMessage(
  trx: Knex.Transaction,
  teamId: string
) {
  const teamUsersList = await TeamUsersDAO.find(trx, { teamId });

  IrisService.sendMessage(realtimeTeamUsersListUpdated(teamId, teamUsersList));
}

async function sendTeamToInvitedUser(
  trx: Knex.Transaction,
  userId: string,
  teamId: string
) {
  const team = await TeamsDAO.findById(trx, teamId);

  if (!team) {
    throw new ResourceNotFoundError("Could not find team for invited user");
  }

  IrisService.sendMessage(realtimeTeamInvited(userId, team));
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
    if (userId) {
      await sendTeamToInvitedUser(trx, userId, teamId);
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
    event: RouteDeleted<TeamUserDb, typeof teamUserDomain>
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
