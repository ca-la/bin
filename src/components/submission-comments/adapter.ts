import { fromSchema } from "../../services/cala-component/cala-adapter";
import { submissionCommentRowSchema, submissionCommentSchema } from "./types";

export default fromSchema({
  modelSchema: submissionCommentSchema,
  rowSchema: submissionCommentRowSchema,
});
