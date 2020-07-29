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
  getLocation,
  escapeHtml,
  createBaseMessage,
  buildImageUrl,
} from "../notifications/notification-messages";
import getLinks, {
  constructHtmlLink,
  LinkType,
} from "../notifications/get-links";
import { getAftershipTrackingLink } from "./service";
import { NotificationMessage } from "../notifications/types";
import {
  BaseFullNotification,
  BaseNotification,
} from "../notifications/models/base";

type BaseFull = Omit<
  BaseNotification,
  | "collectionId"
  | "designId"
  | "approvalStepId"
  | "shipmentTrackingId"
  | "recipientUserId"
> &
  Omit<
    BaseFullNotification,
    | "collectionTitle"
    | "designTitle"
    | "shipmentTrackingDescription"
    | "trackingId"
    | "approvalStepTitle"
  >;

export interface FullShipmentTrackingCreateNotification extends BaseFull {
  collectionId: string | null;
  designId: string;
  approvalStepId: string;
  shipmentTrackingId: string;
  recipientUserId: string;
  type: NotificationType.SHIPMENT_TRACKING_CREATE;
  collectionTitle: string | null;
  designTitle: string | null;
  shipmentTrackingDescription: string | null;
  trackingId: string;
  approvalStepTitle: string | null;
}

interface TrackingBaseWithAssets {
  base: Omit<NotificationMessage, "html" | "title">;
  actorName: string;
  designHtmlLink: string;
  trackingHtmlLink: string | null;
  deepLink: string;
}

function getTrackingBaseWithAssets(
  notification: FullNotification
): TrackingBaseWithAssets | null {
  const {
    designId,
    designTitle,
    collectionId,
    collectionTitle,
    shipmentTrackingId,
    shipmentTrackingDescription,
    approvalStepId,
    approvalStepTitle,
  } = notification;

  if (!shipmentTrackingId || !designId || !approvalStepId) {
    throw new Error("Notification missing required properties");
  }

  const design = { id: designId, title: designTitle };
  const approvalStep = { id: approvalStepId, title: approvalStepTitle };
  const collection = collectionId
    ? {
        id: collectionId,
        title: collectionTitle,
      }
    : null;

  const trackingLink = getAftershipTrackingLink(shipmentTrackingId);
  const { deepLink, htmlLink: designHtmlLink } = getLinks({
    design,
    approvalStep,
    type: LinkType.ShipmentTracking,
  });

  const trackingHtmlLink = shipmentTrackingDescription
    ? constructHtmlLink(deepLink, shipmentTrackingDescription)
    : null;

  const baseMessage = createBaseMessage(notification);
  const actorName = escapeHtml(
    baseMessage.actor.name || baseMessage.actor.email
  );

  return {
    base: {
      ...baseMessage,
      link: trackingLink,
      location: getLocation({ collection, design }),
      imageUrl: buildImageUrl(notification.designImageIds),
    },
    actorName,
    designHtmlLink,
    trackingHtmlLink,
    deepLink,
  };
}

export interface NotificationLayerSchema {
  [NotificationType.SHIPMENT_TRACKING_CREATE]: {
    required: "designId" | "shipmentTrackingId" | "approvalStepId";
    optional: "collectionId";
  };
}

const layer: NotificationsLayer<NotificationLayerSchema> = {
  SHIPMENT_TRACKING_CREATE: buildNotificationComponent<
    NotificationType.SHIPMENT_TRACKING_CREATE,
    NotificationLayerSchema[NotificationType.SHIPMENT_TRACKING_CREATE]["required"],
    NotificationLayerSchema[NotificationType.SHIPMENT_TRACKING_CREATE]["optional"]
  >(
    NotificationType.SHIPMENT_TRACKING_CREATE,
    async (notification: FullNotification) => {
      const assets = getTrackingBaseWithAssets(notification);
      if (!assets) {
        return null;
      }

      const { base, actorName, designHtmlLink } = assets;

      return {
        ...base,
        html: `${span(
          actorName,
          "user-name"
        )} added tracking to ${designHtmlLink}`,
        title: `${actorName} added tracking to ${designHtmlLink}`,
        attachments: [
          {
            text: `${
              notification.shipmentTrackingDescription
                ? `${notification.shipmentTrackingDescription}: `
                : ""
            }${notification.trackingId}`,
            url: assets.deepLink,
          },
        ],
      };
    }
  ),
};
export default layer;
