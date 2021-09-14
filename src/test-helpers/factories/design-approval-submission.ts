import Knex from "knex";
import uuid from "node-uuid";
import db from "../../services/db";

import ApprovalStepSubmission, {
  ApprovalStepSubmissionArtifactType,
  ApprovalStepSubmissionState,
} from "../../components/approval-step-submissions/types";
import createUser from "../../test-helpers/create-user";
import generateCollaborator from "../../test-helpers/factories/collaborator";
import generateApprovalStep from "./design-approval-step";
import * as ApprovalStepSubmissionsDAO from "../../components/approval-step-submissions/dao";

interface ApprovalStepSubmissionWithResources {
  submission: ApprovalStepSubmission;
}

export default async function generateApprovalSubmission(
  trx: Knex.Transaction,
  options: Partial<ApprovalStepSubmission> = {}
): Promise<ApprovalStepSubmissionWithResources> {
  const stepId =
    options.stepId || (await generateApprovalStep(trx)).approvalStep.id;

  const created = await ApprovalStepSubmissionsDAO.create(trx, {
    artifactType:
      options.artifactType ||
      ApprovalStepSubmissionArtifactType.TECHNICAL_DESIGN,
    createdAt: new Date(),

    collaboratorId: null,
    teamUserId: null,
    title: "A submission",
    id: options.id || uuid.v4(),
    state: options.state || ApprovalStepSubmissionState.UNSUBMITTED,
    createdBy: null,
    deletedAt: null,
    stepId,
    annotationId: null,
    ...options,
  });
  const submission = await ApprovalStepSubmissionsDAO.findById(trx, created.id);

  if (!submission) {
    throw new Error("Could not find submission after creating");
  }

  return {
    submission,
  };
}

export async function setupSubmission(
  approvalSubmission: Partial<ApprovalStepSubmission> = {}
) {
  const designer = await createUser();
  const collab = await createUser();
  const trx = await db.transaction();
  try {
    const { approvalStep, design } = await generateApprovalStep(trx, {
      createdBy: designer.user.id,
    });
    const { approvalStep: approvalStep2 } = await generateApprovalStep(trx, {
      createdBy: designer.user.id,
      designId: design.id,
    });

    const { collaborator } = await generateCollaborator(
      {
        designId: design.id,
        userId: collab.user.id,
      },
      trx
    );

    const { submission } = await generateApprovalSubmission(trx, {
      title: "Submarine",
      stepId: approvalStep.id,
      collaboratorId: collaborator.id,
      ...approvalSubmission,
    });
    const { submission: submission2 } = await generateApprovalSubmission(trx, {
      title: "Battleship",
      stepId: approvalStep2.id,
      collaboratorId: collaborator.id,
      ...approvalSubmission,
    });

    await trx.commit();

    return {
      approvalStep,
      approvalStep2,
      designer,
      collaborator,
      collaboratorSession: collab.session,
      design,
      submission,
      submission2,
    };
  } catch (err) {
    await trx.rollback();
    throw err;
  }
}
