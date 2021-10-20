import { pick } from "lodash";
import {
  requireAuth,
  GraphQLContextAuthenticated,
  ForbiddenError,
  GraphQLEndpoint,
} from "../../../apollo";
import { gtProductDesign, DesignInput, gtDesignInput } from "./graphql-types";
import { canCreate } from "../services/can-create";
import createDesign from "../../../services/create-design";
import ProductDesign = require("../../product-designs/domain-objects/product-design");

interface CreateArgs {
  design: DesignInput;
}

export const CreateEndpoint: GraphQLEndpoint<
  CreateArgs,
  ProductDesign,
  GraphQLContextAuthenticated<ProductDesign>
> = {
  endpointType: "Mutation",
  types: [gtProductDesign, gtDesignInput],
  name: "createDesign",
  signature: `(design: DesignInput!): ProductDesign`,
  middleware: requireAuth,
  resolver: async (
    _parent: any,
    args: CreateArgs,
    context: GraphQLContextAuthenticated<ProductDesign>
  ) => {
    const { session } = context;
    const { design: input } = args;

    const collectionId = input.collectionId || null;

    if (!(await canCreate(collectionId, session.userId, session.role))) {
      throw new ForbiddenError(
        "You do not have permission to create a design in this collection"
      );
    }

    return createDesign({
      ...pick(input, "id", "title"),
      userId: session.userId,
      collectionIds: collectionId ? [collectionId] : null,
    });
  },
};
