import { fromSchema } from "../../services/cala-component/cala-adapter";
import { defaultEncoder } from "../../services/data-adapter";
import { creditNoteRowSchema, creditNoteSchema } from "./types";

export const adapter = fromSchema({
  modelSchema: creditNoteSchema,
  rowSchema: creditNoteRowSchema,
  encodeTransformer: creditNoteRowSchema
    .transform(defaultEncoder)
    .transform(creditNoteSchema.parse).parse,
});
