import * as z from "zod";

export const dateStringToDate = z
  .string()
  .transform((dateString: string) => new Date(dateString));

export const nullableDateStringToNullableDate = z
  .string()
  .nullable()
  .transform((nullableDateString: string | null): Date | null =>
    nullableDateString ? new Date(nullableDateString) : null
  );
