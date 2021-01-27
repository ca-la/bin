import * as z from "zod";
import parseNumericString from "../parse-numeric-string";

export const dateStringToDate = z
  .string()
  .transform((dateString: string) => new Date(dateString));

export const nullableDateStringToNullableDate = z
  .string()
  .nullable()
  .transform((nullableDateString: string | null): Date | null =>
    nullableDateString ? new Date(nullableDateString) : null
  );

export const numberStringToNumber = z.string().transform(parseNumericString);

export const nullableNumberStringToNumber = z
  .string()
  .nullable()
  .transform((nullableNumberString: string | null) =>
    nullableNumberString === null
      ? null
      : parseNumericString(nullableNumberString)
  );
