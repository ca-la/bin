import ApprovalSteps from "./approval-steps";
import ApprovalSubmissions from "./approval-step-submissions";
import ShipmentTrackings from "./shipment-trackings";
import DesignEvents from "./design-events";
import TeamUsers from "./team-users";
import { NotificationType } from "./notifications/domain-object";
import {
  registerMessageBuilder,
  NotificationMessageBuilder,
} from "./notifications/notification-messages";

export const calaComponents = [
  ApprovalSteps,
  ApprovalSubmissions,
  ShipmentTrackings,
  DesignEvents,
  TeamUsers,
];

type AllComponentsUnion = typeof calaComponents[number];
type AllNotificationLayersUnion = Extract<
  AllComponentsUnion["notifications"],
  object
>;

type ExtractComponent<
  T extends AllComponentsUnion
> = T["notifications"][keyof T["notifications"]];

type AllNotificationsUnion = Extract<
  | ExtractComponent<typeof ApprovalSubmissions>["notificationSample"]
  | ExtractComponent<typeof ApprovalSteps>["notificationSample"]
  | ExtractComponent<typeof ShipmentTrackings>["notificationSample"]
  | ExtractComponent<typeof TeamUsers>["notificationSample"],
  object
>;

export type CalaNotificationsUnion = AllNotificationsUnion;

export function registerMessageBuilders(): void {
  for (const component of calaComponents) {
    const layer = component.notifications;
    if (!layer) {
      continue;
    }
    const types = Object.keys(layer);
    for (const type of types) {
      const notificationComponent = layer[
        type as keyof AllNotificationLayersUnion
      ] as {
        messageBuilder: NotificationMessageBuilder;
      };
      if (!notificationComponent) {
        continue;
      }
      registerMessageBuilder(
        type as NotificationType,
        notificationComponent.messageBuilder
      );
    }
  }
}
