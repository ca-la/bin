import db from "../../../services/db";
import {
  GraphQLContextBase,
  GraphQLEndpoint,
  NotFoundError,
} from "../../../apollo";
import { DesignAndEnvironmentParent } from "./graphql-types";
import { BaseProductDesign } from "../types";
import * as ProductDesignsDAO from "../dao/dao";
import ResourceNotFoundError from "../../../errors/resource-not-found";
import filterError from "../../../services/filter-error";

export const ProductDesignEndpoint: GraphQLEndpoint<
  {},
  BaseProductDesign,
  GraphQLContextBase<BaseProductDesign>,
  DesignAndEnvironmentParent
> = {
  endpointType: "DesignAndEnvironment",
  types: [],
  name: "design",
  resolver: async (parent: DesignAndEnvironmentParent) => {
    const { designId } = parent;
    return ProductDesignsDAO.findBaseById(db, designId).catch(
      filterError(ResourceNotFoundError, (err: ResourceNotFoundError) => {
        throw new NotFoundError(err.message);
      })
    );
  },
};
