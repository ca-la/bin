import { z } from "zod";
import {
  GraphQLContextAuthenticated,
  GraphQLEndpoint,
  requireAuth,
  Middleware,
  UserInputError,
} from "../../../apollo";
import {
  gtCollectionMeta,
  gtDesignFilter,
  gtDesignListInput,
  gtProductDesign,
} from "./graphql-types";
import * as ProductDesignsDAO from "../dao/dao";
import ProductDesign from "../domain-objects/product-design";
import { designFilterSchema } from "../types";

interface UncheckedDesignFilter {
  type: string;
  value: string | null;
}

interface GetProductDesignListArgs {
  limit: number;
  offset: number;
  filters: UncheckedDesignFilter[];
}

const argSchema = z.object({
  input: z.object({
    limit: z.number().min(0),
    offset: z.number().min(0),
    filters: z.array(designFilterSchema),
  }),
});

type GetProductDesignListResult = ProductDesign[];

export const GetProductDesignList: GraphQLEndpoint<
  GetProductDesignListArgs,
  GetProductDesignListResult,
  GraphQLContextAuthenticated<GetProductDesignListResult>
> = {
  endpointType: "Query",
  types: [gtDesignFilter, gtDesignListInput, gtCollectionMeta, gtProductDesign],
  name: "productDesigns",
  signature: "(input: DesignListInput! = {}): [ProductDesign]",
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
    const argResult = argSchema.safeParse(args);

    if (!argResult.success) {
      throw new UserInputError("Invalid query arguments", {
        issues: argResult.error.issues,
      });
    }

    const { limit, offset, filters } = argResult.data.input;
    const {
      trx,
      session: { userId },
    } = context;

    return ProductDesignsDAO.findAllDesignsThroughCollaboratorAndTeam({
      filters,
      limit,
      offset,
      userId,
      trx,
    });
  },
};
