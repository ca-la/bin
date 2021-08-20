import Knex from "knex";

import ProductDesign from "../product-designs/domain-objects/product-design";
import { ApprovalStepSubmissionDb } from "./types";
import { Recipient } from "../../services/cala-component/cala-notifications";
import TeamUsersDao from "../team-users/dao";
import * as CollaboratorsDAO from "../collaborators/dao";
import {
  recipientsFromTeamUsers,
  recipientsFromCollaborators,
  deduplicateRecipients,
} from "../notifications/service";

export async function getRecipientsByStepSubmissionAndDesign(
  ktx: Knex,
  submission: ApprovalStepSubmissionDb,
  design: ProductDesign
): Promise<Recipient[]> {
  const collaborator = submission.collaboratorId
    ? await CollaboratorsDAO.findById(submission.collaboratorId)
    : null;

  const collaboratorsRecipients: Recipient[] = recipientsFromCollaborators(
    collaborator ? [collaborator] : []
  );

  const teamUser = submission.teamUserId
    ? await TeamUsersDao.findById(ktx, submission.teamUserId)
    : null;

  const teamRecipients: Recipient[] = recipientsFromTeamUsers(
    teamUser ? [teamUser] : []
  );

  const designRecipient = {
    recipientUserId: design.userId,
    recipientCollaboratorId: null,
    recipientTeamUserId: null,
  };

  return deduplicateRecipients([
    ...teamRecipients,
    ...collaboratorsRecipients,
    designRecipient,
  ]);
}
