import {
  GraphQLContextAuthenticated,
  GraphQLEndpoint,
  requireAuth,
  Middleware,
  UserInputError,
} from "../../../apollo";
import { gtCollectionMeta, gtProductDesign } from "./graphql-types";
import * as ProductDesignsDAO from "../dao/dao";
import ProductDesign from "../domain-objects/product-design";

interface GetProductDesignListArgs {
  limit: number;
  offset: number;
}

type GetProductDesignListResult = ProductDesign[];

export const GetProductDesignList: GraphQLEndpoint<
  GetProductDesignListArgs,
  GetProductDesignListResult,
  GraphQLContextAuthenticated<GetProductDesignListResult>
> = {
  endpointType: "Query",
  types: [gtCollectionMeta, gtProductDesign],
  name: "productDesigns",
  signature: "(limit: Int = 20, offset: Int = 20): [ProductDesign]",
  middleware: requireAuth as Middleware<
    GetProductDesignListArgs,
    GraphQLContextAuthenticated<GetProductDesignListResult>,
    GetProductDesignListResult
  >,
  resolver: async (
    _: unknown,
    args: GetProductDesignListArgs,
    context: GraphQLContextAuthenticated<GetProductDesignListResult>
  ) => {
    const { limit, offset } = args;
    const {
      trx,
      session: { userId },
    } = context;

    if ((limit && limit < 0) || (offset && offset < 0)) {
      throw new UserInputError("Offset / Limit cannot be negative!");
    }

    return ProductDesignsDAO.findAllDesignsThroughCollaboratorAndTeam({
      limit,
      offset,
      userId,
      trx,
    });
  },
};
