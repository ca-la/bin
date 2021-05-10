import * as z from "zod";

export const providersSchema = z.enum(["STRIPE"]);
export type Providers = z.infer<typeof providersSchema>;

const baseRowSchema = {
  id: z.string(),
  created_at: z.date(),
  updated_at: z.date().nullable(),
  deleted_at: z.date().nullable(),
  customer_id: z.string(),
  provider: providersSchema,
  user_id: z.string().nullable(),
  team_id: z.string().nullable(),
};

export const customerUserRowSchema = z.object({
  ...baseRowSchema,
  user_id: z.string(),
  team_id: z.null(),
});
export type CustomerUserRow = z.infer<typeof customerUserRowSchema>;

export const customerTeamRowSchema = z.object({
  ...baseRowSchema,
  user_id: z.null(),
  team_id: z.string(),
});

export type customerTeamRow = z.infer<typeof customerUserRowSchema>;

export const customerRowSchema = z.union([
  customerUserRowSchema,
  customerTeamRowSchema,
]);

export type CustomerRow = z.infer<typeof customerRowSchema>;

const baseCustomer = {
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date().nullable(),
  deletedAt: z.date().nullable(),
  customerId: z.string(),
  provider: providersSchema,
  userId: z.null(),
  teamId: z.null(),
};

export const customerUserSchema = z.object({
  ...baseCustomer,
  userId: z.string(),
  teamId: z.null(),
});

export type CustomerUser = z.infer<typeof customerUserSchema>;

export const customerTeamSchema = z.object({
  ...baseCustomer,
  userId: z.null(),
  teamId: z.string(),
});

export type CustomerTeam = z.infer<typeof customerTeamSchema>;

export const customerSchema = z.union([customerUserSchema, customerTeamSchema]);

export type Customer = z.infer<typeof customerSchema>;

export const customerTestBlank: Customer = {
  id: "customer-id",
  createdAt: new Date(2020, 0, 1),
  updatedAt: new Date(2020, 0, 1),
  deletedAt: null,
  customerId: "a-stripe-customer-id",
  provider: "STRIPE",
  userId: null,
  teamId: "a-team-id",
};
