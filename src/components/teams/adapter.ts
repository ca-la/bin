import { fromSchema } from "../../services/cala-component/cala-adapter";
import {
  teamDbRowSchema,
  teamDbSchema,
  teamSchema,
  teamRowSchema,
} from "./types";

export const rawAdapter = fromSchema({
  modelSchema: teamDbSchema,
  rowSchema: teamDbRowSchema,
});

export default fromSchema({
  modelSchema: teamSchema,
  rowSchema: teamRowSchema,
});
