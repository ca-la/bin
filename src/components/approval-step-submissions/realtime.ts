import ApprovalStepSubmission from "./types";

export interface RealtimeApprovalSubmissionUpdated {
  resource: ApprovalStepSubmission;
  approvalStepId: string;
  type: "approval-step-submission/updated";
}

export function isRealtimeApprovalSubmissionUpdated(
  data: any
): data is RealtimeApprovalSubmissionUpdated {
  return (
    "approvalStepId" in data &&
    "type" in data &&
    data.type === "approval-step-submission/updated"
  );
}

export function realtimeApprovalSubmissionUpdated(
  submission: ApprovalStepSubmission
): RealtimeApprovalSubmissionUpdated {
  return {
    type: "approval-step-submission/updated",
    resource: submission,
    approvalStepId: submission.stepId,
  };
}

export interface RealtimeApprovalSubmissionCreated {
  resource: ApprovalStepSubmission;
  approvalStepId: string;
  type: "approval-step-submission/created";
}

export function isRealtimeApprovalSubmissionCreated(
  data: any
): data is RealtimeApprovalSubmissionCreated {
  return (
    "approvalStepId" in data &&
    "type" in data &&
    data.type === "approval-step-submission/created"
  );
}

export function realtimeApprovalSubmissionCreated(
  submission: ApprovalStepSubmission
): RealtimeApprovalSubmissionCreated {
  return {
    type: "approval-step-submission/created",
    resource: submission,
    approvalStepId: submission.stepId,
  };
}
