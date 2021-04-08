import * as z from "zod";

export enum CreditType {
  MANUAL = "MANUAL",
  PROMO_CODE = "PROMO_CODE",
  REFERRED_SIGNUP = "REFERRED_SIGNUP",
  REFERRING_CHECKOUT = "REFERRING_CHECKOUT",
  REFERRING_SUBSCRIPTION = "REFERRING_SUBSCRIPTION",
  REMOVE = "REMOVE",
}
export const creditTypeSchema = z.nativeEnum(CreditType);

const unvalidatedCreditSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  type: creditTypeSchema,
  createdBy: z.string().nullable(),
  givenTo: z.string(),
  creditDeltaCents: z.union([z.bigint(), z.number().int()]),
  description: z.string(),
  expiresAt: z.date().nullable(),
});
export type UnvalidatedCredit = z.infer<typeof unvalidatedCreditSchema>;

export const creditSchema = unvalidatedCreditSchema
  .refine(
    (data: UnvalidatedCredit) =>
      data.type === CreditType.REMOVE
        ? data.creditDeltaCents < 0
        : data.creditDeltaCents > 0,
    {
      message:
        "should be negative for REMOVE type and positive for other types",
      path: ["creditDeltaCents"],
    }
  )
  .refine(
    (data: UnvalidatedCredit) =>
      data.type === CreditType.MANUAL || data.type === CreditType.REMOVE
        ? Boolean(data.createdBy)
        : !data.createdBy,
    {
      message:
        "should be set for MANUAL/REMOVE types and should be null for other types",
      path: ["createdBy"],
    }
  )
  .refine(
    (data: UnvalidatedCredit) =>
      !(data.type === CreditType.REMOVE && Boolean(data.expiresAt)),
    {
      message: "should be null for REMOVE type transaction",
      path: ["expiresAt"],
    }
  );
export type Credit = z.infer<typeof creditSchema>;

export const creditRowSchema = z.object({
  id: z.string(),
  created_at: z.date(),
  type: creditTypeSchema,
  created_by: z.string().nullable(),
  given_to: z.string(),
  credit_delta_cents: z.union([z.bigint(), z.number().int()]),
  description: z.string(),
  expires_at: z.date().nullable(),
});
export type CreditRow = z.infer<typeof creditRowSchema>;
