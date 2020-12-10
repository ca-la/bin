import { NotificationEndpoints } from "../components/notifications/endpoints";
import { UserEndpoints } from "../components/users/endpoints";
import { SessionEndpoints } from "../components/sessions/endpoints";

export const endpoints = [
  ...SessionEndpoints,
  ...NotificationEndpoints,
  ...UserEndpoints,
];

export type Endpoint = typeof endpoints[number];
