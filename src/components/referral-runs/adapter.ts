import { fromSchema } from "../../services/cala-component/cala-adapter";
import { referralRunSchema, referralRunRowSchema } from "./types";

export default fromSchema({
  modelSchema: referralRunSchema,
  rowSchema: referralRunRowSchema,
});
