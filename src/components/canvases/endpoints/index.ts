import { CanvasAndEnvironmentEndpoint } from "./canvas-and-environment";
import { AnnotationsEndpoint } from "./annotations";
import { MeasurementsEndpoint } from "./measurements";
import { DeleteCanvasEndpoint } from "./canvas";

export const CanvasEndpoints = [
  CanvasAndEnvironmentEndpoint,
  AnnotationsEndpoint,
  MeasurementsEndpoint,
  DeleteCanvasEndpoint,
];
