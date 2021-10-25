import { z } from "zod";

export const uploadPolicySchema = z.object({
  contentDisposition: z.string(),
  contentType: z.string(),
  downloadUrl: z.string(),
  formData: z.record(z.any()),
  remoteFileName: z.string(),
  uploadUrl: z.string(),
});

export type UploadPolicy = z.infer<typeof uploadPolicySchema>;
