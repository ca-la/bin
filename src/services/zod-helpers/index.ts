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

export const serializedDates = {
  createdAt: dateStringToDate,
  deletedAt: nullableDateStringToNullableDate,
};

export const serializedDatesWithUpdated = {
  ...serializedDates,
  updatedAt: dateStringToDate,
};

type ZTypeJsonShapeItem = Record<string, ZTypeJson>;
type ZTypeJsonShape = Record<string, ZTypeJsonShapeItem>;

export interface ZTypeJson {
  t: string;
  shape?: ZTypeJsonShape;
  options?: ZTypeJson[];
  innerType?: ZTypeJson;
  checks?: [{ expected: string }];
}
