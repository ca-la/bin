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
  "dao.updated.*": {
    state: async (
      event: DaoUpdated<
        ApprovalStepSubmission,
        typeof approvalStepSubmissionDomain
      >
    ): Promise<void> => {
      const { before, updated } = event;
      if (before.state !== updated.state) {
        await IrisService.sendMessage(
          realtimeApprovalSubmissionUpdated(updated)
        );
      }
    },
  },
};

export default buildListeners<
  ApprovalStepSubmission,
  typeof approvalStepSubmissionDomain
>(approvalStepSubmissionDomain, listeners);
