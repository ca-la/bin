import { NotificationEndpoints } from "../components/notifications/endpoints";
import { UserEndpoints } from "../components/users/endpoints";
import { SessionEndpoints } from "../components/sessions/endpoints";
import { ApprovalStepEndpoints } from "../components/approval-steps/endpoints";

export const endpoints = [
  ...SessionEndpoints,
  ...NotificationEndpoints,
  ...UserEndpoints,
  ...ApprovalStepEndpoints,
];

export type Endpoint = typeof endpoints[number];
