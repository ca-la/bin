import db from "../../services/db";
import { test, Test } from "../../test-helpers/fresh";
import { getRecipientsByStepSubmissionAndDesign } from "./service";
import createUser from "../../test-helpers/create-user";
import { generateTeam } from "../../test-helpers/factories/team";
import { setupSubmission } from "../../test-helpers/factories/./design-approval-submission";
import * as ApprovalStepSubmissionsDAO from "../../components/approval-step-submissions/dao";

test("getRecipientsByStepSubmissionAndDesign returns assignee and design owner in recipients list", async (t: Test) => {
  const { user: userTeamOwner } = await createUser({ withSession: false });

  const {
    design,
    submission,
    submission2,
    collaborator,
  } = await setupSubmission();
  const trx = await db.transaction();
  try {
    const { teamUser: tu1 } = await generateTeam(
      userTeamOwner.id,
      {},
      {},
      {},
      trx
    );

    const submissionWithTeamUserAssignee = await ApprovalStepSubmissionsDAO.update(
      trx,
      submission2.id,
      {
        collaboratorId: null,
        teamUserId: tu1.id,
      }
    );

    t.deepEqual(
      await getRecipientsByStepSubmissionAndDesign(trx, submission, design),
      [
        {
          recipientUserId: collaborator.userId,
          recipientCollaboratorId: collaborator.id,
          recipientTeamUserId: null,
        },
        {
          recipientUserId: design.userId,
          recipientCollaboratorId: null,
          recipientTeamUserId: null,
        },
      ],
      "returns collaborator assignee and design owner in recipients"
    );

    t.deepEqual(
      await getRecipientsByStepSubmissionAndDesign(
        trx,
        submissionWithTeamUserAssignee.updated,
        design
      ),
      [
        {
          recipientUserId: tu1.userId,
          recipientCollaboratorId: null,
          recipientTeamUserId: tu1.id,
        },
        {
          recipientUserId: design.userId,
          recipientCollaboratorId: null,
          recipientTeamUserId: null,
        },
      ],
      "returns team user assignee and design owner in recipients"
    );
  } finally {
    trx.rollback();
  }
});
