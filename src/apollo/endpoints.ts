import { NotificationEndpoints } from "../components/notifications/endpoints";
import { UserEndpoints } from "../components/users/endpoints";
import { SessionEndpoints } from "../components/sessions/endpoints";
import { ApprovalStepEndpoints } from "../components/approval-steps/endpoints";
import { UserDeviceEndpoints } from "../components/user-devices/endpoints";
import { ProductDesignEndpoints } from "../components/product-designs/endpoints";
import { AnnotationEndpoints } from "../components/product-design-canvas-annotations/endpoints";
import { CanvasEndpoints } from "../components/canvases/endpoints";
import { TeamEndpoints } from "../components/teams/endpoints";
import { CommentEndpoints } from "../components/comments/endpoints";
import { ParticipantEndpoints } from "../components/participants/endpoints";
import { CollectionEndpoints } from "../components/collections/endpoints";

export const endpoints = [
  ...SessionEndpoints,
  ...NotificationEndpoints,
  ...UserEndpoints,
  ...ApprovalStepEndpoints,
  ...UserDeviceEndpoints,
  ...ProductDesignEndpoints,
  ...AnnotationEndpoints,
  ...CanvasEndpoints,
  ...TeamEndpoints,
  ...CommentEndpoints,
  ...ParticipantEndpoints,
  ...CollectionEndpoints,
];

export type Endpoint = typeof endpoints[number];
