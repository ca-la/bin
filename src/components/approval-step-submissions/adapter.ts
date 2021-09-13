import {
  approvalStepSubmissionDbRowSchema,
  approvalStepSubmissionDbSchema,
  approvalStepSubmissionRowSchema,
  approvalStepSubmissionSchema,
} from "./types";
import { fromSchema } from "../../services/cala-component/cala-adapter";
import { defaultEncoder } from "../../services/data-adapter";

export const rawAdapter = fromSchema({
  modelSchema: approvalStepSubmissionDbSchema,
  rowSchema: approvalStepSubmissionDbRowSchema,
  encodeTransformer: approvalStepSubmissionDbRowSchema
    .transform(defaultEncoder)
    .transform(approvalStepSubmissionDbSchema.parse).parse,
});

export const adapter = fromSchema({
  modelSchema: approvalStepSubmissionSchema,
  rowSchema: approvalStepSubmissionRowSchema,
  encodeTransformer: approvalStepSubmissionRowSchema
    .transform(defaultEncoder)
    .transform(approvalStepSubmissionSchema.parse).parse,
});
