import uuid from "node-uuid";

import {
  DaoUpdated,
  DaoCreated,
  RouteUpdated,
} from "../../services/pubsub/cala-events";
import DesignEventsDAO from "../design-events/dao";
import * as CollaboratorsDAO from "../collaborators/dao";
import ApprovalStepsDAO from "../approval-steps/dao";
import DesignsDAO from "../product-designs/dao";
import { rawDao as RawTeamUsersDAO } from "../team-users/dao";
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
import { templateDesignEvent } from "../design-events/types";
import { NotificationType } from "../notifications/domain-object";
import notifications from "./notifications";

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
  "route.updated.*": {
    collaboratorId: async (
      event: RouteUpdated<
        ApprovalStepSubmission,
        typeof approvalStepSubmissionDomain
      >
    ) => {
      const collaborator = event.updated.collaboratorId
        ? await CollaboratorsDAO.findById(
            event.updated.collaboratorId,
            false,
            event.trx
          )
        : null;

      const approvalStep = await ApprovalStepsDAO.findById(
        event.trx,
        event.updated.stepId
      );
      if (!approvalStep) {
        throw new Error(
          `Could not find an approval step with id: ${event.updated.stepId}`
        );
      }

      const design = await DesignsDAO.findById(
        approvalStep.designId,
        undefined,
        undefined,
        event.trx
      );
      if (!design) {
        throw new Error(
          `Could not find a design with id: ${approvalStep.designId}`
        );
      }

      await DesignEventsDAO.create(event.trx, {
        ...templateDesignEvent,
        actorId: event.actorId,
        approvalStepId: event.updated.stepId,
        approvalSubmissionId: event.updated.id,
        createdAt: new Date(),
        designId: design.id,
        id: uuid.v4(),
        targetId: collaborator && collaborator.userId,
        type: "STEP_SUBMISSION_ASSIGNMENT",
      });

      if (!collaborator) {
        return;
      }

      await notifications[
        NotificationType.APPROVAL_STEP_SUBMISSION_ASSIGNMENT
      ].send(
        event.trx,
        event.actorId,
        {
          recipientUserId: collaborator.userId,
          recipientCollaboratorId: collaborator.id,
          recipientTeamUserId: null,
        },
        {
          approvalStepId: event.updated.stepId,
          approvalSubmissionId: event.updated.id,
          designId: design.id,
          collectionId: design.collectionIds[0] || null,
          collaboratorId: collaborator.id,
        }
      );
    },
    teamUserId: async (
      event: RouteUpdated<
        ApprovalStepSubmission,
        typeof approvalStepSubmissionDomain
      >
    ) => {
      const teamUser = event.updated.teamUserId
        ? await RawTeamUsersDAO.findById(event.trx, event.updated.teamUserId)
        : null;

      if (event.updated.teamUserId && !teamUser) {
        throw new Error(`Wrong teamUserId: ${event.updated.teamUserId}`);
      }

      const approvalStep = await ApprovalStepsDAO.findById(
        event.trx,
        event.updated.stepId
      );
      if (!approvalStep) {
        throw new Error(
          `Could not find an approval step with id: ${event.updated.stepId}`
        );
      }

      const design = await DesignsDAO.findById(
        approvalStep.designId,
        undefined,
        undefined,
        event.trx
      );
      if (!design) {
        throw new Error(
          `Could not find a design with id: ${approvalStep.designId}`
        );
      }

      await DesignEventsDAO.create(event.trx, {
        ...templateDesignEvent,
        actorId: event.actorId,
        approvalStepId: event.updated.stepId,
        approvalSubmissionId: event.updated.id,
        createdAt: new Date(),
        designId: design.id,
        id: uuid.v4(),
        targetId: teamUser && teamUser.userId,
        type: "STEP_SUBMISSION_ASSIGNMENT",
      });

      if (!teamUser) {
        return;
      }

      await notifications[
        NotificationType.APPROVAL_STEP_SUBMISSION_ASSIGNMENT
      ].send(
        event.trx,
        event.actorId,
        {
          recipientCollaboratorId: null,
          recipientUserId: teamUser.userId,
          recipientTeamUserId: teamUser.id,
        },
        {
          approvalSubmissionId: event.updated.id,
          approvalStepId: approvalStep.id,
          designId: design.id,
          collectionId: design.collectionIds[0] || null,
          collaboratorId: null,
        }
      );
    },
  },
};

export default buildListeners<
  ApprovalStepSubmission,
  typeof approvalStepSubmissionDomain
>(approvalStepSubmissionDomain, listeners);
