import {
  FullNotification,
  INBOX_NOTIFICATION_TYPES,
} from "../../components/notifications/domain-object";
import { NotificationFilter } from "../../published-types";

export function getMatchingFilters(
  notification: FullNotification
): NotificationFilter[] {
  const filters = [];
  notification.archivedAt
    ? filters.push(NotificationFilter.ARCHIVED)
    : filters.push(NotificationFilter.UNARCHIVED);

  if (INBOX_NOTIFICATION_TYPES.includes(notification.type)) {
    filters.push(NotificationFilter.INBOX);
  }
  return filters;
}
