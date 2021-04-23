import { z } from "zod";

const permissionsSchema = z.object({
  canComment: z.boolean(),
  canDelete: z.boolean(),
  canEdit: z.boolean(),
  canEditTitle: z.boolean(),
  canEditVariants: z.boolean(),
  canSubmit: z.boolean(),
  canView: z.boolean(),
});

export type Permissions = z.infer<typeof permissionsSchema>;
