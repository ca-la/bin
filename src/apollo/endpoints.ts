import { NotificationEndpoints } from "../components/notifications/endpoints";
import { UserEndpoints } from "../components/users/endpoints";
import { SessionEndpoints } from "../components/sessions/endpoints";
import { ApprovalStepEndpoints } from "../components/approval-steps/endpoints";
import { UserDeviceEndpoints } from "../components/user-devices/endpoints";
import { ProductDesignEndpoints } from "../components/product-designs/endpoints";
import { CommentEndpoints } from "../components/comments/endpoints";
import { ParticipantEndpoints } from "../components/participants/endpoints";

export const endpoints = [
  ...SessionEndpoints,
  ...NotificationEndpoints,
  ...UserEndpoints,
  ...ApprovalStepEndpoints,
  ...UserDeviceEndpoints,
  ...ProductDesignEndpoints,
  ...CommentEndpoints,
  ...ParticipantEndpoints,
];

export type Endpoint = typeof endpoints[number];
