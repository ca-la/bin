import { DaoUpdated, DaoCreated } from "../../services/pubsub/cala-events";
import {
  Listeners,
  buildListeners,
} from "../../services/cala-component/cala-listeners";

import * as IrisService from "../../components/iris/send-message";
import {
  realtimeApprovalSubmissionUpdated,
  realtimeApprovalSubmissionCreated,
} from "./realtime";
import ApprovalStepSubmission, { approvalStepSubmissionDomain } from "./types";

export const listeners: Listeners<
  ApprovalStepSubmission,
  typeof approvalStepSubmissionDomain
> = {
  "dao.created": (
    event: DaoCreated<
      ApprovalStepSubmission,
      typeof approvalStepSubmissionDomain
    >
  ): Promise<void> =>
    IrisService.sendMessage(realtimeApprovalSubmissionCreated(event.created)),
  "dao.updated": (
    event: DaoUpdated<
      ApprovalStepSubmission,
      typeof approvalStepSubmissionDomain
    >
  ): Promise<void> =>
    IrisService.sendMessage(realtimeApprovalSubmissionUpdated(event.updated)),
};

export default buildListeners<
  ApprovalStepSubmission,
  typeof approvalStepSubmissionDomain
>(approvalStepSubmissionDomain, listeners);
