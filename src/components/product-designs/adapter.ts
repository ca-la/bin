import { fromSchema } from "../../services/cala-component/cala-adapter";
import { baseProductDesignSchema, baseProductDesignRowSchema } from "./types";

export const baseAdapter = fromSchema({
  modelSchema: baseProductDesignSchema,
  rowSchema: baseProductDesignRowSchema,
});
