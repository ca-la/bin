import uuid from "node-uuid";

import {
  DaoUpdated,
  DaoCreated,
  RouteUpdated,
  RouteDeleted,
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
  realtimeApprovalSubmissionDeleted,
} from "./realtime";
import ApprovalStepSubmission, {
  ApprovalStepSubmissionDb,
  approvalStepSubmissionDomain,
  ApprovalStepSubmissionState,
} from "./types";
import { DesignEventTypes, templateDesignEvent } from "../design-events/types";
import { NotificationType } from "../notifications/domain-object";
import notifications from "./notifications";
import { getRecipientsByStepSubmissionAndDesign } from "./service";
import { NotificationComponent } from "../../services/cala-component/cala-notifications";
import ApprovalStepSubmissionsDAO from "./dao";
import ResourceNotFoundError from "../../errors/resource-not-found";

export const listeners: Listeners<
  ApprovalStepSubmissionDb,
  typeof approvalStepSubmissionDomain
> = {
  "dao.created": (
    event: DaoCreated<
      ApprovalStepSubmissionDb,
      typeof approvalStepSubmissionDomain
    >
  ): Promise<void> =>
    IrisService.sendMessage(
      realtimeApprovalSubmissionCreated({ ...event.created, commentCount: 0 })
    ),

  "dao.updated": async (
    event: DaoUpdated<
      ApprovalStepSubmissionDb,
      typeof approvalStepSubmissionDomain
    >
  ): Promise<void> => {
    const found = await ApprovalStepSubmissionsDAO.findById(
      event.trx,
      event.updated.id
    );

    if (!found) {
      throw new ResourceNotFoundError(
        "Could not find submission after updating"
      );
    }

    return IrisService.sendMessage(realtimeApprovalSubmissionUpdated(found));
  },

  "route.updated": async (
    event: RouteUpdated<
      ApprovalStepSubmissionDb,
      typeof approvalStepSubmissionDomain
    >
  ) => {
    const { updated, before, actorId, trx } = event;

    if (
      updated.collaboratorId === before.collaboratorId &&
      updated.teamUserId === before.teamUserId
    ) {
      return;
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

    let targetId = null;
    let didUnassign = true;

    if (updated.collaboratorId) {
      const collaborator = await CollaboratorsDAO.findById(
        updated.collaboratorId,
        false,
        trx
      );
      targetId = collaborator && collaborator.userId;
      didUnassign = collaborator === null;
    } else if (updated.teamUserId) {
      const teamUser = await RawTeamUsersDAO.findById(trx, updated.teamUserId);
      targetId = teamUser && teamUser.userId;
      didUnassign = teamUser === null;
    }

    await DesignEventsDAO.create(trx, {
      ...templateDesignEvent,
      actorId,
      approvalStepId: updated.stepId,
      approvalSubmissionId: updated.id,
      createdAt: new Date(),
      designId: approvalStep.designId,
      id: uuid.v4(),
      targetId,
      type: didUnassign
        ? "STEP_SUBMISSION_UNASSIGNMENT"
        : "STEP_SUBMISSION_ASSIGNMENT",
    });
  },

  "route.updated.*": {
    state: async (
      event: RouteUpdated<
        ApprovalStepSubmissionDb,
        typeof approvalStepSubmissionDomain
      >
    ) => {
      const state = event.updated.state;

      let eventType: DesignEventTypes;
      let notifier: NotificationComponent<any, any, any>;

      switch (state) {
        case ApprovalStepSubmissionState.UNSUBMITTED: {
          eventType = "STEP_SUBMISSION_UNSTARTED";
          notifier =
            notifications[NotificationType.APPROVAL_STEP_SUBMISSION_UNSTARTED];
          break;
        }

        case ApprovalStepSubmissionState.SUBMITTED: {
          eventType = "STEP_SUBMISSION_RE_REVIEW_REQUEST";
          notifier =
            notifications[
              NotificationType.APPROVAL_STEP_SUBMISSION_REREVIEW_REQUEST
            ];
          break;
        }

        case ApprovalStepSubmissionState.APPROVED: {
          eventType = "STEP_SUBMISSION_APPROVAL";
          notifier =
            notifications[NotificationType.APPROVAL_STEP_SUBMISSION_APPROVAL];
          break;
        }

        default: {
          return;
        }
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
        type: eventType,
      });

      const recipients = await getRecipientsByStepSubmissionAndDesign(
        event.trx,
        event.updated,
        design
      );

      for (const recipient of recipients) {
        await notifier.send(event.trx, event.actorId, recipient, {
          approvalStepId: event.updated.stepId,
          approvalSubmissionId: event.updated.id,
          designId: design.id,
          collectionId: design.collectionIds[0] || null,
        });
      }
    },
    collaboratorId: async (
      event: RouteUpdated<
        ApprovalStepSubmissionDb,
        typeof approvalStepSubmissionDomain
      >
    ) => {
      const collaborator =
        event.updated.collaboratorId &&
        (await CollaboratorsDAO.findById(
          event.updated.collaboratorId,
          false,
          event.trx
        ));

      if (!collaborator) {
        return;
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
        ApprovalStepSubmissionDb,
        typeof approvalStepSubmissionDomain
      >
    ) => {
      const teamUser =
        event.updated.teamUserId &&
        (await RawTeamUsersDAO.findById(event.trx, event.updated.teamUserId));

      if (!teamUser) {
        return;
      }

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
  "route.deleted": async (
    event: RouteDeleted<
      ApprovalStepSubmissionDb,
      typeof approvalStepSubmissionDomain
    >
  ): Promise<void> => {
    const found = await ApprovalStepSubmissionsDAO.findDeleted(event.trx, {
      id: event.deleted.id,
    });

    if (!found) {
      throw new ResourceNotFoundError(
        "Could not find submission after updating"
      );
    }

    return IrisService.sendMessage(realtimeApprovalSubmissionDeleted(found));
  },
};

export default buildListeners<
  ApprovalStepSubmission,
  typeof approvalStepSubmissionDomain
>(approvalStepSubmissionDomain, listeners);
