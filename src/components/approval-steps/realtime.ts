import ApprovalStep from "./types";

export interface RealtimeApprovalStepUpdated {
  resource: ApprovalStep;
  type: "approval-step/updated";
  approvalStepId: string;
}

export function isRealtimeApprovalStepUpdated(
  data: any
): data is RealtimeApprovalStepUpdated {
  return (
    "approvalStepId" in data &&
    "type" in data &&
    data.type === "approval-step/updated"
  );
}

export function realtimeApprovalStepUpdated(
  step: ApprovalStep
): RealtimeApprovalStepUpdated {
  return {
    type: "approval-step/updated",
    approvalStepId: step.id,
    resource: step,
  };
}
