import { fromSchema } from "../../services/cala-component/cala-adapter";
import { userDeviceSchema, userDeviceRowSchema } from "./types";

export default fromSchema({
  modelSchema: userDeviceSchema,
  rowSchema: userDeviceRowSchema,
});
