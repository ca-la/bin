import Knex from "knex";
import { uniqWith } from "lodash";
import {
  NotificationMessage,
  NotificationMessageAttachment,
  NotificationMessageForGraphQL,
} from "./types";
import { Recipient } from "../../services/cala-component/cala-notifications";
import TeamUsersDao from "../team-users/dao";
import { TeamUser, Role as TeamUserRole } from "../team-users/types";
import * as CollaboratorsDAO from "../../components/collaborators/dao";
import Collaborator from "../../components/collaborators/types";
import { transformMentionsToGraphQL } from "../comments/service";

export function transformNotificationMessageToGraphQL(
  notificationMessage: NotificationMessage
): NotificationMessageForGraphQL {
  return {
    ...notificationMessage,
    attachments: notificationMessage.attachments.map(
      (attachment: NotificationMessageAttachment) => ({
        ...attachment,
        mentions: transformMentionsToGraphQL(attachment.mentions),
      })
    ),
  };
}

function deduplicateRecipients(recipients: Recipient[]): Recipient[] {
  return uniqWith(
    recipients,
    (recipient: Recipient, otherRecipient: Recipient) => {
      if (
        recipient.recipientUserId === null ||
        otherRecipient.recipientUserId === null
      ) {
        return false;
      }

      return recipient.recipientUserId === otherRecipient.recipientUserId;
    }
  );
}

function recipientsFromTeamUsers(teamUsers: TeamUser[]): Recipient[] {
  return teamUsers.map((teamUser: TeamUser) => {
    return {
      recipientUserId: teamUser.userId,
      recipientCollaboratorId: null,
      recipientTeamUserId: teamUser.id,
    };
  });
}

function recipientsFromCollaborators(
  collaborators: Collaborator[]
): Recipient[] {
  return collaborators.map((collaborator: Collaborator) => {
    return {
      recipientUserId: collaborator.userId,
      recipientCollaboratorId: collaborator.id,
      recipientTeamUserId: null,
    };
  });
}

/*
 * Get the list of recipients from design/collection team users and collaborators by design id
 * in the Recipient type format.
 * The list includes users with team user / collaborator roles >= EDITOR
 * No PARTNER collaborators.
 */
export async function getRecipientsByDesign(
  ktx: Knex,
  designId: string
): Promise<Recipient[]> {
  const teamUsers = await TeamUsersDao.findByDesign(
    ktx,
    designId,
    (q: Knex.QueryBuilder) => {
      return q.andWhereRaw("team_users.role = ANY(:allowedRoles)", {
        allowedRoles: [
          TeamUserRole.EDITOR,
          TeamUserRole.ADMIN,
          TeamUserRole.OWNER,
        ],
      });
    }
  );

  const teamRecipients: Recipient[] = recipientsFromTeamUsers(teamUsers);

  const collaborators = await CollaboratorsDAO.findByDesign(
    designId,
    ktx,
    (q: Knex.QueryBuilder) => {
      return q.andWhereRaw(
        "collaborators_forcollaboratorsviewraw.role = ANY(:allowedRoles)",
        {
          allowedRoles: ["EDIT", "OWNER"],
        }
      );
    }
  );

  const collaboratorsRecipients: Recipient[] = recipientsFromCollaborators(
    collaborators
  );

  // remove duplicated recipients by recipientUserId in case same user is the collaborator and team user
  const recipientsList = deduplicateRecipients([
    ...teamRecipients,
    ...collaboratorsRecipients,
  ]);

  return recipientsList;
}

/*
 * Get the list of recipients from collection team users and collaborators by
 * collection id in the Recipient type format.
 *
 * The list includes users with team user / collaborator roles >= EDITOR,
 * no PARTNER collaborators.
 */
export async function getRecipientsByCollection(
  ktx: Knex,
  collectionId: string
): Promise<Recipient[]> {
  const teamUsers = await TeamUsersDao.findByCollection(
    ktx,
    collectionId,
    (q: Knex.QueryBuilder) => {
      return q.andWhereRaw("team_users.role = ANY(:allowedRoles)", {
        allowedRoles: [
          TeamUserRole.EDITOR,
          TeamUserRole.ADMIN,
          TeamUserRole.OWNER,
        ],
      });
    }
  );

  const teamRecipients: Recipient[] = recipientsFromTeamUsers(teamUsers);

  const collaborators = await CollaboratorsDAO.findByCollection(
    collectionId,
    ktx,
    (q: Knex.QueryBuilder) => {
      return q.andWhereRaw(
        "collaborators_forcollaboratorsviewraw.role = ANY(:allowedRoles)",
        {
          allowedRoles: ["EDIT", "OWNER"],
        }
      );
    }
  );

  const collaboratorsRecipients: Recipient[] = recipientsFromCollaborators(
    collaborators
  );

  // remove duplicated recipients by recipientUserId in case same user is the collaborator and team user
  const recipientsList = deduplicateRecipients([
    ...teamRecipients,
    ...collaboratorsRecipients,
  ]);

  return recipientsList;
}
