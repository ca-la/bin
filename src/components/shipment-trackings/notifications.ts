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
import normalizeTitle from "../../services/normalize-title";

type BaseFull = Omit<
  BaseNotification,
  | "collectionId"
  | "designId"
  | "approvalStepId"
  | "shipmentTrackingEventId"
  | "shipmentTrackingId"
  | "recipientUserId"
> &
  Omit<
    BaseFullNotification,
    | "collectionTitle"
    | "designTitle"
    | "shipmentTrackingDescription"
    | "trackingEventTag"
    | "trackingEventSubtag"
    | "trackingId"
    | "approvalStepTitle"
  >;

export interface FullShipmentTrackingCreateNotification extends BaseFull {
  collectionId: string | null;
  designId: string;
  approvalStepId: string;
  shipmentTrackingEventId: null;
  shipmentTrackingId: string;
  recipientUserId: string;
  type: NotificationType.SHIPMENT_TRACKING_CREATE;
  collectionTitle: string | null;
  designTitle: string | null;
  shipmentTrackingDescription: string;
  trackingId: string;
  approvalStepTitle: string | null;
  trackingEventTag: null;
  trackingEventSubtag: null;
}

export interface FullShipmentTrackingUpdateNotification extends BaseFull {
  collectionId: string | null;
  designId: string;
  approvalStepId: string;
  shipmentTrackingEventId: string;
  shipmentTrackingId: string;
  recipientUserId: string;
  type: NotificationType.SHIPMENT_TRACKING_UPDATE;
  collectionTitle: string | null;
  designTitle: string | null;
  shipmentTrackingDescription: string;
  trackingEventTag: string;
  trackingEventSubtag: string;
  trackingId: string;
  approvalStepTitle: string | null;
}

interface TrackingBaseWithAssets {
  base: Omit<NotificationMessage, "html" | "title" | "text">;
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
    type,
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
    shipmentTrackingId,
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
      type,
    },
    actorName,
    designHtmlLink,
    trackingHtmlLink,
    deepLink,
  };
}

const SUBTAG_MESSSAGES: { [subtag: string]: string } = {
  Delivered_001: "Shipment delivered successfully",
  Delivered_002: "Package picked up by the customer",
  Delivered_003: "Package delivered to and signed by the customer",
  Delivered_004:
    "Package delivered to the customer and cash collected on delivery",
  AvailableForPickup_001:
    "The package arrived at a pickup point near you and is available for pickup",
  Exception_001:
    "Delivery of the package failed due to some shipping exception",
  Exception_002: "Delivery of the package failed as the customer relocated",
  Exception_003:
    "Delivery of the package failed as the recipient refused to take the package due to some reason",
  Exception_004:
    "Package delayed due to some issues during the customs clearance",
  Exception_005: "Package delayed due to some unforeseen reasons",
  Exception_006:
    "The package being held due to pending payment from the customer's end",
  Exception_007: "Package not delivered due to incorrect recipient address",
  Exception_008:
    "Package available for the pickup but not collected by the customer",
  Exception_009:
    "Package rejected by the carrier due to noncompliance with its guidelines",
  Exception_010: "The package returned to the original sender",
  Exception_011: "The package returned to the sender",
  Exception_012: "Shipment damaged",
  Exception_013: "Delivery of the package failed as it got lost",
  AttemptFail_001:
    "The delivery of the package failed due to some reason. Courier usually leaves a notice and will try to deliver again",
  AttemptFail_002: "Recipient not available at the given address",
  AttemptFail_003: "Business is closed at the time of delivery",
  InTransit_001: "Shipment on the way",
  InTransit_002: "Shipment accepted by the carrier",
  InTransit_003: "Shipment arrived at a hub or sorting center",
  InTransit_004: "International shipment arrived at the destination country",
  InTransit_005: "Customs clearance completed",
  InTransit_006: "Package handed over to customs for clearance",
  InTransit_007: "Package departed from the facility",
  InTransit_008: "Problem resolved and shipment in transit",
  InTransit_009: "Shipment forwarded to a different delivery address",
  InfoReceived_001:
    "The carrier received a request from the shipper and is about to pick up the shipment",
  OutForDelivery_001: "The package is out for delivery",
  OutForDelivery_003: "The customer is contacted before the final delivery",
  OutForDelivery_004: "A delivery appointment is scheduled",
  Pending_001:
    "No information available on the carrier website or the tracking number is yet to be tracked",
  Expired_001: "No tracking information of the shipment, from last 30 days",
};

function getNotificationFromTag(
  tag: string,
  trackingTitle: string,
  deepLink: string
): {
  html: string;
  title: string;
  text: string;
} {
  const trackingHtmlLink = constructHtmlLink(deepLink, trackingTitle);

  switch (tag) {
    case "Pending":
      return {
        title: `Tracking for ${trackingTitle} is Pending`,
        text: `Tracking for ${trackingTitle} is Pending`,
        html: `Tracking for ${trackingHtmlLink} is ${constructHtmlLink(
          deepLink,
          "Pending"
        )}`,
      };

    case "InfoReceived":
      return {
        title: `Tracking info for ${trackingTitle} has been received.`,
        text: `Tracking info for ${trackingTitle} has been received.`,
        html: `Tracking info for ${trackingHtmlLink} has been received.`,
      };

    case "InTransit":
      return {
        title: `${trackingTitle} is in Transit`,
        text: `${trackingTitle} is in Transit`,
        html: `${trackingHtmlLink} is in ${constructHtmlLink(
          deepLink,
          "Transit"
        )}`,
      };

    case "OutForDelivery":
      return {
        title: `${trackingTitle} is Out for Delivery`,
        text: `${trackingTitle} is Out for Delivery`,
        html: `${trackingHtmlLink} is ${constructHtmlLink(
          deepLink,
          "Out for Delivery"
        )}`,
      };

    case "AvailableForPickup":
      return {
        title: `${trackingTitle} is Available for Pickup`,
        text: `${trackingTitle} is Available for Pickup`,
        html: `${trackingHtmlLink} is ${constructHtmlLink(
          deepLink,
          "Available for Pickup"
        )}`,
      };

    case "Delivered":
      return {
        title: `${trackingTitle} was Delivered`,
        text: `${trackingTitle} was Delivered`,
        html: `${trackingHtmlLink} was ${constructHtmlLink(
          deepLink,
          "Delivered"
        )}`,
      };

    case "AttemptFail":
      return {
        title: `Delivery attempt for ${trackingTitle} failed.`,
        text: `Delivery attempt for ${trackingTitle} failed.`,
        html: `Delivery attempt for ${trackingHtmlLink} failed.`,
      };

    case "Exception":
      return {
        title: `Delivery for ${trackingTitle} has an Exception`,
        text: `Delivery for ${trackingTitle} has an Exception`,
        html: `Delivery for ${trackingHtmlLink} has an ${constructHtmlLink(
          deepLink,
          "Exception"
        )}`,
      };

    case "Expired":
      return {
        title: `Tracking for ${trackingTitle} has Expired`,
        text: `Tracking for ${trackingTitle} has Expired`,
        html: `Tracking for ${trackingHtmlLink} has ${constructHtmlLink(
          deepLink,
          "Expired"
        )}`,
      };

    default:
      throw new Error(`Tag "${tag}" is not supported`);
  }
}

export interface NotificationLayerSchema {
  [NotificationType.SHIPMENT_TRACKING_CREATE]: {
    required: "designId" | "shipmentTrackingId" | "approvalStepId";
    optional: "collectionId";
  };
  [NotificationType.SHIPMENT_TRACKING_UPDATE]: {
    required:
      | "designId"
      | "shipmentTrackingId"
      | "approvalStepId"
      | "shipmentTrackingEventId";
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
        title: `${actorName} added tracking to ${normalizeTitle({
          title: notification.designTitle,
        })}`,
        text: `Added tracking to ${normalizeTitle({
          title: notification.designTitle,
        })}`,
        attachments: [
          {
            text: `${notification.shipmentTrackingDescription} · ${notification.trackingId}`,
            url: assets.deepLink,
          },
        ],
      };
    }
  ),
  SHIPMENT_TRACKING_UPDATE: buildNotificationComponent<
    NotificationType.SHIPMENT_TRACKING_UPDATE,
    NotificationLayerSchema[NotificationType.SHIPMENT_TRACKING_UPDATE]["required"],
    NotificationLayerSchema[NotificationType.SHIPMENT_TRACKING_UPDATE]["optional"]
  >(
    NotificationType.SHIPMENT_TRACKING_UPDATE,
    async (notification: FullNotification) => {
      const {
        trackingEventTag,
        trackingEventSubtag,
        shipmentTrackingDescription,
        trackingId,
      } = notification;
      if (
        !trackingEventTag ||
        !trackingEventSubtag ||
        !shipmentTrackingDescription ||
        !trackingId
      ) {
        throw new Error("Notification is mising required properties");
      }

      if (!SUBTAG_MESSSAGES[trackingEventSubtag]) {
        throw new Error(`Subtag "${trackingEventSubtag}" is not supported`);
      }

      const assets = getTrackingBaseWithAssets(notification);
      if (!assets) {
        return null;
      }

      const { base, deepLink } = assets;

      return {
        ...base,
        ...getNotificationFromTag(
          trackingEventTag,
          shipmentTrackingDescription,
          deepLink
        ),
        attachments: [
          {
            text: SUBTAG_MESSSAGES[trackingEventSubtag],
            url: deepLink,
          },
        ],
      };
    }
  ),
};
export default layer;
