import * as z from "zod";
import { Role as TeamUserRole } from "../team-users/types";

export enum TeamType {
  DESIGNER = "DESIGNER",
  PARTNER = "PARTNER",
}
export const teamTypeSchema = z.nativeEnum(TeamType);

export const teamDbSchema = z.object({
  id: z.string(),
  title: z.string(),
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
});
export type Team = z.infer<typeof teamSchema>;

export const teamRowSchema = teamDbRowSchema.extend({
  role: z.nativeEnum(TeamUserRole),
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
  stripeCardToken: z.string(),
});

export type TeamSubscriptionUpgrade = z.infer<
  typeof teamSubscriptionUpgradeSchema
>;
