import Knex from "knex";

import { Task, HandlerResult } from "../types";
import TeamUsersDAO from "../../../components/team-users/dao";
import { sendTeamsToUpdatedUser } from "../../../components/team-users/listeners";
import { claimDesignInvitations } from "../../../services/claim-design-invitations";
import * as DuplicationService from "../../../services/duplicate";

export async function postProcessUserCreation(
  trx: Knex.Transaction,
  task: Task<"POST_PROCESS_USER_CREATION">
): Promise<HandlerResult> {
  const { keys } = task;
  await claimDesignInvitations(keys.email, keys.userId, trx);
  const updatedTeamUsers = await TeamUsersDAO.claimAllByEmail(
    trx,
    keys.email,
    keys.userId
  );
  if (updatedTeamUsers.length) {
    await sendTeamsToUpdatedUser(trx, keys.userId);
  }

  // Intentionally not checking ownership permissions - TODO reconsider security model
  // This will start off the user with any number of 'default' designs that
  // will automatically show in their drafts when they first log in.
  await DuplicationService.duplicateDesigns(
    keys.userId,
    keys.designIdsToDuplicate,
    trx
  );

  return {
    type: "SUCCESS",
    message: `POST_PROCESS_USER_CREATION task successfully completed for user ${keys.userId}.`,
  };
}
