import Knex from "knex";
import { toPairs, uniqWith } from "lodash";
import {
  NotificationMessage,
  NotificationMessageAttachment,
  NotificationMessageForGraphQL,
  NotificationMessageAttachmentForGraphQL,
} from "./types";
import { Recipient } from "../../services/cala-component/cala-notifications";
import TeamUsersDao from "../team-users/dao";
import { TeamUser, Role as TeamUserRole } from "../team-users/types";
import * as CollaboratorsDAO from "../../components/collaborators/dao";
import Collaborator from "../../components/collaborators/types";

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

  const teamRecipients: Recipient[] = teamUsers.map((teamUser: TeamUser) => {
    return {
      recipientUserId: teamUser.userId,
      recipientCollaboratorId: null,
      recipientTeamUserId: teamUser.id,
    };
  });

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

  const collaboratorsRecipients: Recipient[] = collaborators.map(
    (collaborator: Collaborator) => {
      return {
        recipientUserId: collaborator.userId,
        recipientCollaboratorId: collaborator.id,
        recipientTeamUserId: null,
      };
    }
  );

  // remove duplicated recipients by recipientUserId in case same user is the collaborator and team user
  const recipientsList = uniqWith(
    [...teamRecipients, ...collaboratorsRecipients],
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

  return recipientsList;
}
