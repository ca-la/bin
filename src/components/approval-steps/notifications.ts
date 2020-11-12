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
  [NotificationType.APPROVAL_STEP_ASSIGNMENT]: {
    required: "designId" | "approvalStepId";
    optional: "collectionId" | "collaboratorId";
  };
  [NotificationType.APPROVAL_STEP_COMPLETION]: {
    required: "designId" | "approvalStepId";
    optional: "collectionId";
  };
  [NotificationType.APPROVAL_STEP_PAIRING]: {
    required: "designId" | "approvalStepId";
    optional: "collectionId";
  };
}

const layer: NotificationsLayer<NotificationLayerSchema> = {
  APPROVAL_STEP_ASSIGNMENT: buildNotificationComponent<
    NotificationType.APPROVAL_STEP_ASSIGNMENT,
    NotificationLayerSchema[NotificationType.APPROVAL_STEP_ASSIGNMENT]["required"],
    NotificationLayerSchema[NotificationType.APPROVAL_STEP_ASSIGNMENT]["optional"]
  >(
    NotificationType.APPROVAL_STEP_ASSIGNMENT,
    async (notification: FullNotification) => {
      const assets = getApprovalBaseWithAssets(notification);
      if (!assets) {
        return null;
      }

      return {
        ...assets.base,
        html: `${span(assets.actorName, "user-name")} assigned you to ${
          notification.approvalStepTitle
        } on ${assets.designHtmlLink}`,
        title: `${assets.actorName} assigned you to ${notification.approvalStepTitle} on ${assets.designHtmlLink}`,
      };
    }
  ),
  APPROVAL_STEP_COMPLETION: buildNotificationComponent<
    NotificationType.APPROVAL_STEP_COMPLETION,
    NotificationLayerSchema[NotificationType.APPROVAL_STEP_COMPLETION]["required"],
    NotificationLayerSchema[NotificationType.APPROVAL_STEP_COMPLETION]["optional"]
  >(
    NotificationType.APPROVAL_STEP_COMPLETION,
    async (notification: FullNotification) => {
      const assets = getApprovalBaseWithAssets(notification);
      if (!assets) {
        return null;
      }

      return {
        ...assets.base,
        html: `${span(assets.actorName, "user-name")} completed ${
          notification.approvalStepTitle
        } on ${assets.designHtmlLink}`,
        title: `${assets.actorName} completed ${notification.approvalStepTitle} on ${assets.designHtmlLink}`,
      };
    }
  ),
  APPROVAL_STEP_PAIRING: buildNotificationComponent<
    NotificationType.APPROVAL_STEP_PAIRING,
    NotificationLayerSchema[NotificationType.APPROVAL_STEP_COMPLETION]["required"],
    NotificationLayerSchema[NotificationType.APPROVAL_STEP_COMPLETION]["optional"]
  >(
    NotificationType.APPROVAL_STEP_PAIRING,
    async (notification: FullNotification) => {
      const assets = getApprovalBaseWithAssets(notification);
      if (!assets) {
        return null;
      }

      return {
        ...assets.base,
        html: `${span(assets.actorName, "user-name")} has been assigned to ${
          assets.stepHtmlLink
        }`,
        title: `${assets.actorName} has been assigned to ${assets.stepHtmlLink}`,
      };
    }
  ),
};
export default layer;
