import uuid from "node-uuid";

import ApprovalStep, { approvalStepDomain, ApprovalStepState } from "./types";
import {
  DaoUpdated,
  DaoUpdating,
  RouteUpdated,
} from "../../services/pubsub/cala-events";
import {
  Listeners,
  buildListeners,
} from "../../services/cala-component/cala-listeners";
import {
  handleStepCompletion,
  handleUserStepCompletion,
  handleStepReopen,
  handleUserStepReopen,
} from "../../services/approval-step-state";

import Logger from "../../services/logger";
import DesignEventsDAO from "../design-events/dao";
import * as CollaboratorsDAO from "../collaborators/dao";
import { rawDao as RawTeamUsersDAO } from "../team-users/dao";
import DesignsDAO from "../product-designs/dao";
import { NotificationType } from "../notifications/domain-object";
import * as IrisService from "../iris/send-message";
import { realtimeApprovalStepUpdated } from "./realtime";
import { templateDesignEvent } from "../design-events/types";

import notifications from "./notifications";

export const listeners: Listeners<ApprovalStep, typeof approvalStepDomain> = {
  "dao.updating": async (
    event: DaoUpdating<ApprovalStep, typeof approvalStepDomain>
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

  "dao.updated.*": {
    state: async (
      event: DaoUpdated<ApprovalStep, typeof approvalStepDomain>
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
    },
  },

  "dao.updated": async (
    event: DaoUpdated<ApprovalStep, typeof approvalStepDomain>
  ): Promise<void> => {
    // NOTE: We are explicitly _not_ awaiting here to avoid blocking
    IrisService.sendMessage(realtimeApprovalStepUpdated(event.updated)).catch(
      Logger.logServerError
    );
  },

  "route.updated.*": {
    state: async (
      event: RouteUpdated<ApprovalStep, typeof approvalStepDomain>
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
      event: RouteUpdated<ApprovalStep, typeof approvalStepDomain>
    ): Promise<void> => {
      const collaborator = event.updated.collaboratorId
        ? await CollaboratorsDAO.findById(
            event.updated.collaboratorId,
            false,
            event.trx
          )
        : null;

      if (event.updated.collaboratorId && !collaborator) {
        throw new Error(
          `Wrong collaboratorId: ${event.updated.collaboratorId}`
        );
      }

      await DesignEventsDAO.create(event.trx, {
        ...templateDesignEvent,
        actorId: event.actorId,
        approvalStepId: event.updated.id,
        createdAt: new Date(),
        designId: event.updated.designId,
        id: uuid.v4(),
        targetId: (collaborator && collaborator.userId) || null,
        type: "STEP_ASSIGNMENT",
      });

      if (!collaborator) {
        return;
      }

      const approvalStep = event.updated;

      const design = await DesignsDAO.findById(approvalStep.designId);
      if (!design) {
        throw new Error(
          `Could not find a design with id: ${approvalStep.designId}`
        );
      }
      await notifications[NotificationType.APPROVAL_STEP_ASSIGNMENT].send(
        event.trx,
        event.actorId,
        {
          recipientCollaboratorId: collaborator.id,
          recipientUserId: collaborator.userId,
          recipientTeamUserId: null,
        },
        {
          approvalStepId: approvalStep.id,
          designId: design.id,
          collectionId: design.collectionIds[0] || null,
          collaboratorId: collaborator.id,
        }
      );
    },
    teamUserId: async (
      event: RouteUpdated<ApprovalStep, typeof approvalStepDomain>
    ): Promise<void> => {
      const teamUser = event.updated.teamUserId
        ? await RawTeamUsersDAO.findById(event.trx, event.updated.teamUserId)
        : null;

      if (event.updated.teamUserId && !teamUser) {
        throw new Error(`Wrong teamUserId: ${event.updated.teamUserId}`);
      }

      await DesignEventsDAO.create(event.trx, {
        ...templateDesignEvent,
        actorId: event.actorId,
        approvalStepId: event.updated.id,
        createdAt: new Date(),
        designId: event.updated.designId,
        id: uuid.v4(),
        targetId: (teamUser && teamUser.userId) || null,
        type: "STEP_ASSIGNMENT",
      });

      if (!teamUser) {
        return;
      }

      const approvalStep = event.updated;

      const design = await DesignsDAO.findById(approvalStep.designId);
      if (!design) {
        throw new Error(
          `Could not find a design with id: ${approvalStep.designId}`
        );
      }
      await notifications[NotificationType.APPROVAL_STEP_ASSIGNMENT].send(
        event.trx,
        event.actorId,
        {
          recipientCollaboratorId: null,
          recipientUserId: teamUser.userId,
          recipientTeamUserId: teamUser.id,
        },
        {
          approvalStepId: approvalStep.id,
          designId: design.id,
          collectionId: design.collectionIds[0] || null,
          collaboratorId: null,
        }
      );
    },
  },
};

export default buildListeners<ApprovalStep, typeof approvalStepDomain>(
  approvalStepDomain,
  listeners
);
