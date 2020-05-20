import Knex from "knex";
import uuid from "node-uuid";

import ApprovalStepSubmission, {
  ApprovalStepSubmissionArtifactType,
  ApprovalStepSubmissionState,
} from "../../components/approval-step-submissions/domain-object";
import generateApprovalStep from "./design-approval-step";
import * as ApprovalStepSubmissionsDAO from "../../components/approval-step-submissions/dao";

interface ApprovalStepSubmissionWithResources {
  submission: ApprovalStepSubmission;
}

export default async function generateApprovalSubmission(
  trx: Knex.Transaction,
  options: Partial<ApprovalStepSubmission & { createdBy?: string }> = {}
): Promise<ApprovalStepSubmissionWithResources> {
  const stepId =
    options.stepId || (await generateApprovalStep(trx)).approvalStep.id;

  const [submission] = await ApprovalStepSubmissionsDAO.createAll(trx, [
    {
      ...options,
      id: options.id || uuid.v4(),
      state: options.state || ApprovalStepSubmissionState.UNSUBMITTED,
      artifactType:
        options.artifactType ||
        ApprovalStepSubmissionArtifactType.TECHNICAL_DESIGN,
      stepId,
    } as ApprovalStepSubmission,
  ]);

  return {
    submission,
  };
}
