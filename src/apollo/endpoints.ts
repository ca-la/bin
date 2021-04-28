import { NotificationEndpoints } from "../components/notifications/endpoints";
import { UserEndpoints } from "../components/users/endpoints";
import { SessionEndpoints } from "../components/sessions/endpoints";
import { ApprovalStepEndpoints } from "../components/approval-steps/endpoints";
import { UserDeviceEndpoints } from "../components/user-devices/endpoints";
import { ProductDesignEndpoints } from "../components/product-designs/endpoints";

export const endpoints = [
  ...SessionEndpoints,
  ...NotificationEndpoints,
  ...UserEndpoints,
  ...ApprovalStepEndpoints,
  ...UserDeviceEndpoints,
  ...ProductDesignEndpoints,
];

export type Endpoint = typeof endpoints[number];
