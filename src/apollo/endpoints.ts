import { NotificationEndpoints } from "../components/notifications/endpoints";
import { UserEndpoints } from "../components/users/endpoints";
import { SessionEndpoints } from "../components/sessions/endpoints";
import { ApprovalStepEndpoints } from "../components/approval-steps/endpoints";
import { UserDeviceEndpoints } from "../components/user-devices/endpoints";
import { ProductDesignEndpoints } from "../components/product-designs/endpoints";
import { CommentEndpoints } from "../components/comments/endpoints";
import { ProductDesignCanvasAnnotationEndpoints } from "../components/product-design-canvas-annotations/endpoint";

export const endpoints = [
  ...SessionEndpoints,
  ...NotificationEndpoints,
  ...UserEndpoints,
  ...ApprovalStepEndpoints,
  ...UserDeviceEndpoints,
  ...ProductDesignEndpoints,
  ...CommentEndpoints,
  ...ProductDesignCanvasAnnotationEndpoints,
];

export type Endpoint = typeof endpoints[number];
