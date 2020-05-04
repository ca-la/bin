import {
  actualizeDesignStepsAfterBidAcceptance,
  handleStepCompletion,
  handleUserStepCompletion
} from '../approval-step-state';
import { ApprovalStepState } from '../../components/approval-steps/domain-object';

import { CalaEvents } from './';
import { listen } from './emitter';

export function init(): void {
  listen('bid.accepted', async (event: CalaEvents.BidAccepted) => {
    await actualizeDesignStepsAfterBidAcceptance(
      event.trx,
      event.bidId,
      event.designId
    );
  });

  listen(
    'approvalStep.stateChanged',
    async (event: CalaEvents.ApprovalStepStateChanged) => {
      const { approvalStep, trx } = event;

      if (approvalStep.state === ApprovalStepState.COMPLETED) {
        await handleStepCompletion(trx, approvalStep);
      }
    }
  );

  listen(
    'route.updated.approvalStep',
    async (event: CalaEvents.RouteUpdatedApprovalStep) => {
      const { afterUpdate, beforeUpdate, actorId, trx } = event;

      if (afterUpdate.state === ApprovalStepState.COMPLETED) {
        if (beforeUpdate.state === ApprovalStepState.CURRENT) {
          await handleUserStepCompletion(trx, afterUpdate, actorId);
        }
      }
    }
  );
}
