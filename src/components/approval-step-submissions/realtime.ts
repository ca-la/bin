import ApprovalStepSubmission from "./types";
import { DesignEventWithMeta } from "../design-events/types";
import { Serialized } from "../../types/serialized";
import { CommentWithResources } from "../comments/types";

export interface RealtimeApprovalSubmissionUpdated {
  resource: ApprovalStepSubmission;
  approvalStepId: string;
  type: "approval-step-submission/updated";
}

export function isRealtimeApprovalSubmissionUpdated(
  data: any
): data is Serialized<RealtimeApprovalSubmissionUpdated> {
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
): data is Serialized<RealtimeApprovalSubmissionCreated> {
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

export interface RealtimeApprovalSubmissionDeleted {
  resource: ApprovalStepSubmission;
  approvalStepId: string;
  type: "approval-step-submission/deleted";
}

export function isRealtimeApprovalSubmissionDeleted(
  data: any
): data is Serialized<RealtimeApprovalSubmissionDeleted> {
  return (
    "approvalStepId" in data &&
    "type" in data &&
    data.type === "approval-step-submission/deleted"
  );
}

export function realtimeApprovalSubmissionDeleted(
  submission: ApprovalStepSubmission
): RealtimeApprovalSubmissionDeleted {
  return {
    type: "approval-step-submission/deleted",
    resource: submission,
    approvalStepId: submission.stepId,
  };
}

export interface RealtimeApprovalSubmissionRevisionRequest {
  resource: {
    event: DesignEventWithMeta;
    comment: CommentWithResources;
  };
  approvalStepId: string;
  type: "approval-step-submission/revision-request";
}

export function isRealtimeApprovalSubmissionRevisionRequest(
  data: any
): data is Serialized<RealtimeApprovalSubmissionRevisionRequest> {
  return (
    "approvalStepId" in data &&
    "type" in data &&
    data.type === "approval-step-submission/revision-request"
  );
}

export function realtimeApprovalSubmissionRevisionRequest({
  approvalStepId,
  event,
  comment,
}: {
  approvalStepId: string;
  event: DesignEventWithMeta;
  comment: CommentWithResources;
}): RealtimeApprovalSubmissionRevisionRequest {
  return {
    type: "approval-step-submission/revision-request",
    resource: { event, comment },
    approvalStepId,
  };
}
