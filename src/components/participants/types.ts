import * as z from "zod";
import { mentionTypeSchema } from "../comments/types";
import { userRoleSchema } from "../users/types";
import { bidTaskTypeIdSchema } from "../bid-task-types/types";

export const participantSchema = z.object({
  type: mentionTypeSchema,
  id: z.string(),
  displayName: z.string(),
  role: userRoleSchema.nullable(),
  bidTaskTypes: z.array(z.string()),
  userId: z.string().nullable(),
});
export type Participant = z.infer<typeof participantSchema>;

export const participantRowSchema = z.object({
  type: mentionTypeSchema,
  id: z.string(),
  display_name: z.string(),
  role: userRoleSchema.nullable(),
  bid_task_type_ids: z.array(bidTaskTypeIdSchema),
  user_id: z.string().nullable(),
});
export type ParticipantRow = z.infer<typeof participantRowSchema>;
