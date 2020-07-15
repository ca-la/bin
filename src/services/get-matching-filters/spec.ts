import tape from "tape";
import { test } from "../../test-helpers/fresh";

import { getMatchingFilters } from ".";
import { NotificationFilter } from "../../published-types";
import {
  NotificationType,
  FullNotification,
} from "../../components/notifications/domain-object";

test("Unarchived and Inbox", async (t: tape.Test) => {
  const matchedFilters = getMatchingFilters({
    archivedAt: null,
    type: NotificationType.TASK_ASSIGNMENT,
  } as FullNotification);
  t.deepEqual(matchedFilters, [
    NotificationFilter.UNARCHIVED,
    NotificationFilter.INBOX,
  ]);
});

test("Only unarchived", async (t: tape.Test) => {
  const matchedFilters = getMatchingFilters({
    archivedAt: null,
    type: NotificationType.COSTING_EXPIRED,
  } as FullNotification);
  t.deepEqual(matchedFilters, [NotificationFilter.UNARCHIVED]);
});

test("Archived", async (t: tape.Test) => {
  const matchedFilters = getMatchingFilters({
    archivedAt: new Date(),
    type: NotificationType.COSTING_EXPIRED,
  } as FullNotification);
  t.deepEqual(matchedFilters, [NotificationFilter.ARCHIVED]);
});
