import ApprovalStep, { domain, ApprovalStepState } from './types';
import {
  DaoUpdated,
  DaoUpdating,
  RouteUpdated
} from '../../services/pubsub/cala-events';
import {
  Listeners,
  buildListeners
} from '../../services/cala-component/cala-listeners';
import {
  handleStepCompletion,
  handleUserStepCompletion,
  handleStepReopen,
  handleUserStepReopen
} from '../../services/approval-step-state';

import * as DesignEventsDAO from '../../dao/design-events';
import uuid from 'node-uuid';
import * as NotificationsService from '../../services/create-notifications';
import * as CollaboratorsDAO from '../../components/collaborators/dao';

export const listeners: Listeners<ApprovalStep, typeof domain> = {
  'dao.updating': async (
    event: DaoUpdating<ApprovalStep, typeof domain>
  ): Promise<void> => {
    const { patch, before } = event;

    if (patch.state) {
      const now = new Date();
      let completedAt = null;
      let startedAt = null;
      if (patch.state === ApprovalStepState.CURRENT) {
        startedAt = now;
      }
      if (patch.state === ApprovalStepState.COMPLETED) {
        startedAt = before.startedAt || now;
        completedAt = now;
      }
      patch.startedAt = startedAt;
      patch.completedAt = completedAt;
    }
  },

  'dao.updated.*': {
    state: async (
      event: DaoUpdated<ApprovalStep, typeof domain>
    ): Promise<void> => {
      const { before, updated, trx } = event;
      if (updated.state === ApprovalStepState.COMPLETED) {
        await handleStepCompletion(trx, updated);
      }

      if (
        before.state === ApprovalStepState.COMPLETED &&
        updated.state === ApprovalStepState.CURRENT
      ) {
        await handleStepReopen(trx, updated);
      }
    }
  },

  'route.updated.*': {
    state: async (
      event: RouteUpdated<ApprovalStep, typeof domain>
    ): Promise<void> => {
      const { updated, before, actorId, trx } = event;
      if (updated.state === ApprovalStepState.COMPLETED) {
        if (before.state === ApprovalStepState.CURRENT) {
          await handleUserStepCompletion(trx, updated, actorId);
        }
      }
      if (
        before.state === ApprovalStepState.COMPLETED &&
        updated.state === ApprovalStepState.CURRENT
      ) {
        await handleUserStepReopen(trx, updated, actorId);
      }
    },
    collaboratorId: async (
      event: RouteUpdated<ApprovalStep, typeof domain>
    ): Promise<void> => {
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
  }
};

export default buildListeners<ApprovalStep, typeof domain>(domain, listeners);
