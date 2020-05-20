import { requireProperties } from "../require-properties";
import InvalidDataError = require("../../errors/invalid-data");

function isEmptyString(val: any): boolean {
  return typeof val === "string" && val.trim() === "";
}

function exists(val: any): boolean {
  return val !== null && val !== undefined && !isEmptyString(val);
}

export function validateProperties(obj: object, ...props: string[]): void {
  try {
    requireProperties(obj, ...props);
  } catch (err) {
    if (err.message === "requireProperties was called on a falsy object") {
      throw new InvalidDataError(
        "validateProperties was called on a falsy object"
      );
    } else if (err.message.search("Missing required properties: ") > -1) {
      throw new InvalidDataError(err.message);
    }
  }
}

export function validateValues(data: object): void {
  return validateProperties(data, ...Object.keys(data));
}

export function validatePropertiesFormatted(
  data: { [key: string]: any },
  messages: { [key: string]: string }
): void {
  if (!data) {
    throw new InvalidDataError("Missing required information");
  }

  Object.keys(messages).forEach((key: string): void => {
    if (!exists(data[key])) {
      throw new InvalidDataError(
        `Missing required information: ${messages[key]}`
      );
    }
  });
}

export function validateTypeWithGuardOrThrow<T extends object>(
  data: any,
  guard: (data: T) => data is T,
  message: string
): T {
  if (!guard(data)) {
    throw new Error(message);
  }
  return data;
}
