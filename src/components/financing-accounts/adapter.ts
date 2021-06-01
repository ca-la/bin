import { fromSchema } from "../../services/cala-component/cala-adapter";
import { financingAccountDbSchema, financingAccountDbRowSchema } from "./types";

export const rawAdapter = fromSchema({
  modelSchema: financingAccountDbSchema,
  rowSchema: financingAccountDbRowSchema,
});
