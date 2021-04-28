import {
  requireAuth,
  composeMiddleware,
  attachDesignFromDesignId,
  attachDesignPermissions,
  requireDesignViewPermissions,
  GraphQLEndpoint,
  GraphQLContextBase,
} from "../../../apollo";
import {
  gtDesignAndEnvironment,
  gtBaseProductDesign,
  DesignAndEnvironment,
} from "./graphql-types";
import { gtCollection } from "../../collections/graphql-types";

interface DesignAndEnvironmentArgs {
  designId: string;
}

export const DesignAndEnvironmentEndpoint: GraphQLEndpoint<
  DesignAndEnvironmentArgs,
  DesignAndEnvironment,
  GraphQLContextBase<DesignAndEnvironment>
> = {
  endpointType: "Query",
  types: [gtDesignAndEnvironment, gtBaseProductDesign, gtCollection],
  name: "DesignAndEnvironment",
  signature: `(designId: String): DesignAndEnvironment`,
  middleware: composeMiddleware(
    requireAuth,
    attachDesignFromDesignId,
    attachDesignPermissions,
    requireDesignViewPermissions
  ),
  resolver: async (_: any, args: DesignAndEnvironmentArgs) => {
    return {
      designId: args.designId,
    } as DesignAndEnvironment;
  },
};
