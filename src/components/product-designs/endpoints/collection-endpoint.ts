import { GraphQLContextBase, GraphQLEndpoint } from "../../../apollo";
import { DesignAndEnvironmentParent } from "./graphql-types";
import * as CollectionsDAO from "../../collections/dao";
import { CollectionDb } from "../../collections/types";

export const CollectionEndpoint: GraphQLEndpoint<
  {},
  CollectionDb,
  GraphQLContextBase<CollectionDb>,
  DesignAndEnvironmentParent
> = {
  endpointType: "DesignAndEnvironment",
  types: [],
  name: "collection",
  resolver: async (parent: DesignAndEnvironmentParent) => {
    const { designId } = parent;
    const collections = await CollectionsDAO.findByDesign(designId);
    return collections[0] || null;
  },
};
