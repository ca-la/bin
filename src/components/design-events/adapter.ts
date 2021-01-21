import { fromSchema } from "../../services/cala-component/cala-adapter";
import {
  designEventRowSchema,
  designEventSchema,
  designEventWithMetaRowSchema,
  designEventWithMetaSchema,
} from "./types";

export default fromSchema({
  modelSchema: designEventSchema,
  rowSchema: designEventRowSchema,
});

export const withMetaAdapter = fromSchema({
  modelSchema: designEventWithMetaSchema,
  rowSchema: designEventWithMetaRowSchema,
});
