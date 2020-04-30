import { listen } from './emitter';
import { CalaEvents } from './';
import {
  actualizeDesignStepsAfterBidAcceptance,
  makeNextStepCurrentIfNeeded
} from '../approval-step-state';
import { ApprovalStepState } from '../../components/approval-steps/domain-object';

export function init(): void {
  listen<CalaEvents.BidAccepted>(
    'bid.accepted',
    async (event: CalaEvents.BidAccepted) => {
      await actualizeDesignStepsAfterBidAcceptance(
        event.trx,
        event.bidId,
        event.designId
      );
    }
  );
  listen<CalaEvents.ApprovalStepStateChanged>(
    'approvalStep.stateChanged',
    async (event: CalaEvents.ApprovalStepStateChanged) => {
      if (event.approvalStep.state === ApprovalStepState.COMPLETED) {
        await makeNextStepCurrentIfNeeded(event.trx, event.approvalStep);
      }
    }
  );
}
