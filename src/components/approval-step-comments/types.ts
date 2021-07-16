import * as z from "zod";

import { createCommentWithAttachmentsSchema } from "../comments/types";

export const createRevisionRequestSchema = z.object({
  comment: createCommentWithAttachmentsSchema,
});

export type CreateRevisionRequest = z.infer<typeof createRevisionRequestSchema>;
