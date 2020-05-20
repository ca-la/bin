import DataAdapter from "../../services/data-adapter";
import { hasProperties } from "../../services/require-properties";

export default interface UserOnboarding {
  userId: string;
  welcomeModalViewedAt: Date | null;
  tasksPageViewedAt: Date | null;
  timelinePageViewedAt: Date | null;
  partnerDashboardViewedAt: Date | null;
}

export interface UserOnboardingRow {
  user_id: string;
  welcome_modal_viewed_at: Date | null;
  tasks_page_viewed_at: Date | null;
  timeline_page_viewed_at: Date | null;
  partner_dashboard_viewed_at: Date | null;
}

export const dataAdapter = new DataAdapter<UserOnboardingRow, UserOnboarding>();

export function isUserOnboardingRow(row: object): row is UserOnboardingRow {
  return hasProperties(
    row,
    "user_id",
    "welcome_modal_viewed_at",
    "tasks_page_viewed_at",
    "timeline_page_viewed_at",
    "partner_dashboard_viewed_at"
  );
}

export function isUserOnboarding(data: object): data is UserOnboarding {
  return hasProperties(
    data,
    "welcomeModalViewedAt",
    "tasksPageViewedAt",
    "timelinePageViewedAt",
    "partnerDashboardViewedAt"
  );
}
