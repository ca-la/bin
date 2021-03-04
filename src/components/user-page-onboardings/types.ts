import * as z from "zod";

export enum Page {
  ALL_DESIGNS = "ALL_DESIGNS",
  BIDS = "BIDS",
  COLLECTIONS = "COLLECTIONS",
  DASHBOARD = "DASHBOARD",
  DESIGN_TOOL = "DESIGN_TOOL",
  DRAFTS = "DRAFTS",
  REVIEWS = "REVIEWS",
  TEAMS = "TEAMS",
}

export const pageSchema = z.nativeEnum(Page);

export const userPageOnboardingRowSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  page: pageSchema,
  viewed_at: z.date().nullable(),
});
export type UserPageOnboardingRow = z.infer<typeof userPageOnboardingRowSchema>;

export const userPageOnboardingSchema = z.object({
  id: z.string(),
  userId: z.string(),
  page: pageSchema,
  viewedAt: z.date().nullable(),
});
export type UserPageOnboarding = z.infer<typeof userPageOnboardingSchema>;
