import { fromSchema } from "../../services/cala-component/cala-adapter";
import { invoiceFeeRowSchema, invoiceFeeSchema } from "./types";

export default fromSchema({
  modelSchema: invoiceFeeSchema,
  rowSchema: invoiceFeeRowSchema,
});
