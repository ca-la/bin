import { fromSchema } from "../../services/cala-component/cala-adapter";
import {
  productDesignOptionSchema,
  productDesignOptionRowSchema,
} from "./types";

export default fromSchema({
  modelSchema: productDesignOptionSchema,
  rowSchema: productDesignOptionRowSchema,
});
