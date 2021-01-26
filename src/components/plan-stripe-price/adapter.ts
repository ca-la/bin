import { fromSchema } from "../../services/cala-component/cala-adapter";
import { planStripePriceRowSchema, planStripePriceSchema } from "./types";

export const dataAdapter = fromSchema({
  modelSchema: planStripePriceSchema,
  rowSchema: planStripePriceRowSchema,
});
