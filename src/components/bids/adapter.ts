import { fromSchema } from "../../services/cala-component/cala-adapter";
import {
  bidDbRowSchema,
  bidDbSchema,
  bidRowSchema,
  bidSchema,
  bidWithEventsRowSchema,
  bidWithEventsSchema,
} from "./types";

export const rawAdapter = fromSchema({
  modelSchema: bidDbSchema,
  rowSchema: bidDbRowSchema,
});

export const dataAdapter = fromSchema({
  modelSchema: bidSchema,
  rowSchema: bidRowSchema,
});

export const withEventsDataAdapter = fromSchema({
  modelSchema: bidWithEventsSchema,
  rowSchema: bidWithEventsRowSchema,
});
