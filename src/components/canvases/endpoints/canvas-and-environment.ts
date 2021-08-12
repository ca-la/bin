import {
  requireAuth,
  composeMiddleware,
  attachDesignFromCanvasId,
  attachDesignPermissions,
  requireDesignViewPermissions,
  GraphQLEndpoint,
  GraphQLContextBase,
} from "../../../apollo";
import { gtCanvasAndEnvironment, CanvasAndEnvironment } from "./graphql-types";

interface CanvasAndEnvironmentArgs {
  canvasId: string;
}

export const CanvasAndEnvironmentEndpoint: GraphQLEndpoint<
  CanvasAndEnvironmentArgs,
  CanvasAndEnvironment,
  GraphQLContextBase<CanvasAndEnvironment>
> = {
  endpointType: "Query",
  types: [gtCanvasAndEnvironment],
  name: "CanvasAndEnvironment",
  signature: `(canvasId: String): CanvasAndEnvironment`,
  middleware: composeMiddleware(
    requireAuth,
    attachDesignFromCanvasId,
    attachDesignPermissions,
    requireDesignViewPermissions
  ),
  resolver: async (_: any, args: CanvasAndEnvironmentArgs) => {
    return {
      canvasId: args.canvasId,
    } as CanvasAndEnvironment;
  },
};
