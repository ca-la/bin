import {
  actualizeDesignStepsAfterBidAcceptance,
  handleStepCompletion,
  handleUserStepCompletion
} from '../approval-step-state';
import { ApprovalStepState } from '../../components/approval-steps/domain-object';
import * as DesignEventsDAO from '../../dao/design-events';
import uuid from 'node-uuid';
import * as NotificationsService from '../create-notifications';
import * as CollaboratorsDAO from '../../components/collaborators/dao';

// this variable protects from double initialization
// for separate tests (bin/tt), we init pubsub manually inside the spec.ts files
// but we don't want to run it twice in case of bin/test
let isSubscribed = false;

import { CalaEvents } from './';
import { listen } from './emitter';

export function init(): void {
  if (isSubscribed) {
    return;
  }
  isSubscribed = true;

  listen<CalaEvents.DaoAcceptedBid>(
    'dao.accepted.bid',
    async (event: CalaEvents.DaoAcceptedBid) => {
      await actualizeDesignStepsAfterBidAcceptance(
        event.trx,
        event.bidId,
        event.designId
      );
    }
  );
  listen<CalaEvents.DaoUpdatedApprovalStepState>(
    'dao.updated.approvalStep.state',
    async (event: CalaEvents.DaoUpdatedApprovalStepState) => {
      const { updated, trx } = event;

      if (updated.state === ApprovalStepState.COMPLETED) {
        await handleStepCompletion(trx, updated);
      }
    }
  );

  listen(
    'route.updated.approvalStep',
    async (event: CalaEvents.RouteUpdatedApprovalStep) => {
      const { updated, before, actorId, trx } = event;

      if (updated.state === ApprovalStepState.COMPLETED) {
        if (before.state === ApprovalStepState.CURRENT) {
          await handleUserStepCompletion(trx, updated, actorId);
        }
      }
    }
  );
  listen<CalaEvents.RouteUpdatedApprovalStepCollaboratorId>(
    'route.updated.approvalStep.collaboratorId',
    async (event: CalaEvents.RouteUpdatedApprovalStepCollaboratorId) => {
      if (!event.updated.collaboratorId) {
        return;
      }

      const collaborator = await CollaboratorsDAO.findById(
        event.updated.collaboratorId
      );
      if (!collaborator || !collaborator.user) {
        return;
      }

      await DesignEventsDAO.create(event.trx, {
        actorId: event.actorId,
        commentId: null,
        approvalStepId: event.updated.id,
        approvalSubmissionId: null,
        bidId: null,
        createdAt: new Date(),
        designId: event.updated.designId,
        id: uuid.v4(),
        quoteId: null,
        targetId: collaborator.user.id,
        type: 'STEP_ASSIGNMENT'
      });

      await NotificationsService.sendApprovalStepAssignmentNotification(
        event.trx,
        event.actorId,
        event.updated
      );
    }
  );
}
