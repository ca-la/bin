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
});

export const adapter = fromSchema({
  modelSchema: approvalStepSubmissionSchema,
  rowSchema: approvalStepSubmissionRowSchema,
  encodeTransformer: approvalStepSubmissionRowSchema
    .transform(defaultEncoder)
    .transform(approvalStepSubmissionSchema.parse).parse,
});
