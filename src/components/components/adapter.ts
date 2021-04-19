import { fromSchema } from "../../services/cala-component/cala-adapter";
import {
  componentSchema,
  componentRowSchema,
  serializedComponentSchema,
  Component,
  ComponentRow,
  SerializedComponent,
} from "./types";

export default fromSchema<Component, ComponentRow>({
  modelSchema: componentSchema,
  rowSchema: componentRowSchema,
});

export const serializedAdapter = fromSchema<SerializedComponent, ComponentRow>({
  modelSchema: serializedComponentSchema,
  rowSchema: componentRowSchema,
});
