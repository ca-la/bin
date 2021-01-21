import * as z from "zod";
import {
  dateStringToDate,
  nullableDateStringToNullableDate,
} from "../../services/zod-helpers";
import {
  BaseNotification,
  BaseFullNotification,
} from "../notifications/models/base";
import { NotificationType } from "../notifications/types";

export enum ApprovalStepType {
  CHECKOUT = "CHECKOUT",
  TECHNICAL_DESIGN = "TECHNICAL_DESIGN",
  SAMPLE = "SAMPLE",
  PRODUCTION = "PRODUCTION",
}
export const approvalStepTypeSchema = z.nativeEnum(ApprovalStepType);

export const baseApprovalStepSchema = z.object({
  id: z.string(),
  title: z.string(),
  ordering: z.number(),
  designId: z.string(),
  collaboratorId: z.string().nullable(),
  teamUserId: z.string().nullable(),
  type: approvalStepTypeSchema,
  state: z.string(),
  reason: z.string().nullable(),
  createdAt: z.date(),
  completedAt: z.date().nullable(),
  startedAt: z.date().nullable(),
  dueAt: z.date().nullable(),
});
export type BaseApprovalStep = z.infer<typeof baseApprovalStepSchema>;

export enum ApprovalStepState {
  BLOCKED = "BLOCKED",
  UNSTARTED = "UNSTARTED",
  CURRENT = "CURRENT",
  COMPLETED = "COMPLETED",
  SKIP = "SKIP",
}
export const approvalStepStateSchema = z.nativeEnum(ApprovalStepState);

export const approvalBlockedSchema = baseApprovalStepSchema.extend({
  state: z.literal(ApprovalStepState.BLOCKED),
  reason: z.string(),
  completedAt: z.null(),
  startedAt: z.null(),
});
export type ApprovalBlocked = z.infer<typeof approvalBlockedSchema>;

export const approvalUnstartedSchema = baseApprovalStepSchema.extend({
  state: z.literal(ApprovalStepState.UNSTARTED),
  reason: z.null(),
  completedAt: z.null(),
  startedAt: z.null(),
});
export type ApprovalUnstarted = z.infer<typeof approvalUnstartedSchema>;

export const approvalCurrentSchema = baseApprovalStepSchema.extend({
  state: z.literal(ApprovalStepState.CURRENT),
  reason: z.null(),
  completedAt: z.null(),
  startedAt: z.date(),
});
export type ApprovalCurrent = z.infer<typeof approvalCurrentSchema>;

export const approvalCompletedSchema = baseApprovalStepSchema.extend({
  state: z.literal(ApprovalStepState.COMPLETED),
  reason: z.null(),
  completedAt: z.date(),
  startedAt: z.date(),
});
export type ApprovalCompleted = z.infer<typeof approvalCompletedSchema>;

export const approvalSkipSchema = baseApprovalStepSchema.extend({
  state: z.literal(ApprovalStepState.SKIP),
  reason: z.null(),
  completedAt: z.null(),
  startedAt: z.null(),
});
export type ApprovalSkip = z.infer<typeof approvalSkipSchema>;

export const approvalStepSchema = z.union([
  approvalBlockedSchema,
  approvalUnstartedSchema,
  approvalCurrentSchema,
  approvalCompletedSchema,
  approvalSkipSchema,
]);
type ApprovalStep = z.infer<typeof approvalStepSchema>;

export const approvalStepSchemaFromBase = baseApprovalStepSchema.transform(
  approvalStepSchema.parse
);

export default ApprovalStep;

export const approvalStepRowSchema = z.object({
  id: z.string(),
  title: z.string(),
  ordering: z.number(),
  design_id: z.string(),
  collaborator_id: z.string().nullable(),
  team_user_id: z.string().nullable(),
  state: z.string(),
  reason: z.string().nullable(),
  type: z.string(),
  created_at: z.date(),
  completed_at: z.date().nullable(),
  started_at: z.date().nullable(),
  due_at: z.date().nullable(),
});
export type ApprovalStepRow = z.infer<typeof approvalStepRowSchema>;

export const approvalStepRowJsonSchema = approvalStepRowSchema.extend({
  created_at: dateStringToDate,
  completed_at: nullableDateStringToNullableDate,
  started_at: nullableDateStringToNullableDate,
  due_at: nullableDateStringToNullableDate,
});
export type ApprovalStepRowJson = z.infer<typeof approvalStepRowJsonSchema>;

export const approvalStepDomain = "ApprovalStep" as "ApprovalStep";

type Base = Omit<
  BaseNotification,
  | "collaboratorId"
  | "collectionId"
  | "designId"
  | "approvalStepId"
  | "recipientUserId"
  | "recipientCollaboratorId"
  | "recipientTeamUserId"
>;

export interface ApprovalStepAssignmentNotification extends Base {
  collaboratorId: string | null;
  collectionId: string | null;
  designId: string;
  approvalStepId: string;
  recipientUserId: string | null;
  recipientCollaboratorId: string | null;
  recipientTeamUserId: string | null;
}

type BaseFull = Omit<
  BaseFullNotification & ApprovalStepAssignmentNotification,
  "collectionTitle" | "designTitle"
>;

export interface FullApprovalStepAssignmentNotification extends BaseFull {
  collectionTitle: string | null;
  designTitle: string | null;
  type: NotificationType.APPROVAL_STEP_ASSIGNMENT;
}
