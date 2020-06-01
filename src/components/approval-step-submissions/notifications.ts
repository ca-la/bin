import {
  FullNotification,
  NotificationType,
} from "../notifications/domain-object";
import {
  buildNotificationComponent,
  NotificationsLayer,
} from "../../services/cala-component/cala-notifications";
import {
  span,
  getApprovalBaseWithAssets,
} from "../notifications/notification-messages";

export interface NotificationLayerSchema {
  [NotificationType.APPROVAL_STEP_SUBMISSION_ASSIGNMENT]: {
    required:
      | "designId"
      | "approvalStepId"
      | "approvalSubmissionId"
      | "collaboratorId";
    optional: "collectionId";
  };
  [NotificationType.APPROVAL_STEP_SUBMISSION_APPROVAL]: {
    required: "designId" | "approvalStepId" | "approvalSubmissionId";
    optional: "collectionId";
  };
  [NotificationType.APPROVAL_STEP_SUBMISSION_REVISION_REQUEST]: {
    required: "designId" | "approvalStepId" | "approvalSubmissionId";
    optional: "collectionId";
  };
  [NotificationType.APPROVAL_STEP_SUBMISSION_REREVIEW_REQUEST]: {
    required: "designId" | "approvalStepId" | "approvalSubmissionId";
    optional: "collectionId";
  };
}

const layer: NotificationsLayer<NotificationLayerSchema> = {
  APPROVAL_STEP_SUBMISSION_ASSIGNMENT: buildNotificationComponent<
    NotificationType.APPROVAL_STEP_SUBMISSION_ASSIGNMENT,
    NotificationLayerSchema[NotificationType.APPROVAL_STEP_SUBMISSION_ASSIGNMENT]["required"],
    NotificationLayerSchema[NotificationType.APPROVAL_STEP_SUBMISSION_ASSIGNMENT]["optional"]
  >(
    NotificationType.APPROVAL_STEP_SUBMISSION_ASSIGNMENT,
    async (notification: FullNotification) => {
      const assets = getApprovalBaseWithAssets(notification);
      if (!assets) {
        return null;
      }

      return {
        ...assets.base,
        html: `${span(assets.actorName, "user-name")} assigned you to review ${
          notification.approvalSubmissionTitle
        } for ${assets.designHtmlLink}`,
        title: `${assets.actorName} assigned you to review ${notification.approvalSubmissionTitle} for ${assets.designHtmlLink}`,
      };
    }
  ),
  APPROVAL_STEP_SUBMISSION_APPROVAL: buildNotificationComponent<
    NotificationType.APPROVAL_STEP_SUBMISSION_APPROVAL,
    NotificationLayerSchema[NotificationType.APPROVAL_STEP_SUBMISSION_APPROVAL]["required"],
    NotificationLayerSchema[NotificationType.APPROVAL_STEP_SUBMISSION_APPROVAL]["optional"]
  >(
    NotificationType.APPROVAL_STEP_SUBMISSION_APPROVAL,
    async (notification: FullNotification) => {
      const assets = getApprovalBaseWithAssets(notification);
      if (!assets) {
        return null;
      }

      return {
        ...assets.base,
        html: `${span(assets.actorName, "user-name")} approved ${
          notification.approvalSubmissionTitle
        } (${notification.approvalStepTitle}) on ${assets.designHtmlLink}`,
        title: `${assets.actorName} approved ${notification.approvalSubmissionTitle} (${notification.approvalStepTitle}) on ${assets.designHtmlLink}`,
      };
    }
  ),
  APPROVAL_STEP_SUBMISSION_REVISION_REQUEST: buildNotificationComponent<
    NotificationType.APPROVAL_STEP_SUBMISSION_REVISION_REQUEST,
    NotificationLayerSchema[NotificationType.APPROVAL_STEP_SUBMISSION_REVISION_REQUEST]["required"],
    NotificationLayerSchema[NotificationType.APPROVAL_STEP_SUBMISSION_REVISION_REQUEST]["optional"]
  >(
    NotificationType.APPROVAL_STEP_SUBMISSION_REVISION_REQUEST,
    async (notification: FullNotification) => {
      const assets = getApprovalBaseWithAssets(notification);
      if (!assets) {
        return null;
      }

      return {
        ...assets.base,
        html: `${span(assets.actorName, "user-name")} requested revisions to ${
          notification.approvalSubmissionTitle
        } (${notification.approvalStepTitle}) on ${assets.designHtmlLink}`,
        title: `${assets.actorName} requested revisions to ${notification.approvalSubmissionTitle} (${notification.approvalStepTitle}) on ${assets.designHtmlLink}`,
      };
    }
  ),
  APPROVAL_STEP_SUBMISSION_REREVIEW_REQUEST: buildNotificationComponent<
    NotificationType.APPROVAL_STEP_SUBMISSION_REREVIEW_REQUEST,
    NotificationLayerSchema[NotificationType.APPROVAL_STEP_SUBMISSION_REREVIEW_REQUEST]["required"],
    NotificationLayerSchema[NotificationType.APPROVAL_STEP_SUBMISSION_REREVIEW_REQUEST]["optional"]
  >(
    NotificationType.APPROVAL_STEP_SUBMISSION_REREVIEW_REQUEST,
    async (notification: FullNotification) => {
      const assets = getApprovalBaseWithAssets(notification);
      if (!assets) {
        return null;
      }

      return {
        ...assets.base,
        html: `${span(assets.actorName, "user-name")} requested re-review on ${
          notification.approvalSubmissionTitle
        } (${notification.approvalStepTitle}) on ${assets.designHtmlLink}`,
        title: `${assets.actorName} requested re-review on ${notification.approvalSubmissionTitle} (${notification.approvalStepTitle}) on ${assets.designHtmlLink}`,
      };
    }
  ),
};
export default layer;