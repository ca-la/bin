import { fromSchema } from "../../services/cala-component/cala-adapter";
import { paymentMethodSchema, paymentMethodRowSchema } from "./types";

export default fromSchema({
  modelSchema: paymentMethodSchema,
  rowSchema: paymentMethodRowSchema,
});
