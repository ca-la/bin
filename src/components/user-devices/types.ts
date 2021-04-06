import * as z from "zod";

export const userDeviceDomain = "UserDevice" as "UserDevice";

export const userDeviceSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
  userId: z.string(),
  deviceToken: z.string(),
});

export type UserDevice = z.infer<typeof userDeviceSchema>;

export const userDeviceRowSchema = z.object({
  id: z.string(),
  created_at: z.date(),
  updated_at: z.date(),
  deleted_at: z.date().nullable(),
  user_id: z.string(),
  device_token: z.string(),
});

export type UserDeviceRow = z.infer<typeof userDeviceRowSchema>;
