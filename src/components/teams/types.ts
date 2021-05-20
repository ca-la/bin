import * as z from "zod";
import { Role as TeamUserRole } from "../team-users/types";

export enum TeamType {
  DESIGNER = "DESIGNER",
  PARTNER = "PARTNER",
}
export const teamTypeSchema = z.nativeEnum(TeamType);

export const teamDbSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  createdAt: z.date(),
  deletedAt: z.date().nullable(),
  type: teamTypeSchema,
});
export type TeamDb = z.infer<typeof teamDbSchema>;

export const teamDbRowSchema = z.object({
  id: z.string(),
  title: z.string(),
  created_at: z.date(),
  deleted_at: z.date().nullable(),
  type: teamTypeSchema,
});
export type TeamDbRow = z.infer<typeof teamDbRowSchema>;

export const teamSchema = teamDbSchema.extend({
  role: z.nativeEnum(TeamUserRole),
  teamUserId: z.string(),
});
export type Team = z.infer<typeof teamSchema>;

export const teamRowSchema = teamDbRowSchema.extend({
  role: z.nativeEnum(TeamUserRole),
  team_user_id: z.string(),
});
export type TeamRow = z.infer<typeof teamRowSchema>;

export const unsavedTeamSchema = teamDbSchema.omit({
  id: true,
  createdAt: true,
  deletedAt: true,
  type: true,
});

export const teamSubscriptionUpgradeSchema = z.object({
  planId: z.string(),
  stripeCardToken: z.string().nullable().optional(),
});

export type TeamSubscriptionUpgrade = z.infer<
  typeof teamSubscriptionUpgradeSchema
>;

export const teamTestBlank: Team = {
  createdAt: new Date(2012, 11, 24),
  deletedAt: null,
  id: "a-team-id",
  role: TeamUserRole.EDITOR,
  teamUserId: "a-team-user-id",
  title: "A team",
  type: TeamType.DESIGNER,
};
