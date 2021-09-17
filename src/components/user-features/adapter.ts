import { fromSchema } from "../../services/cala-component/cala-adapter";
import { userFeatureRowSchema, userFeatureSchema } from "./types";

export const adapter = fromSchema({
  modelSchema: userFeatureSchema,
  rowSchema: userFeatureRowSchema,
});
