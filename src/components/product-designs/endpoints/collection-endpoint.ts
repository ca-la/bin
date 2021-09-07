import { GraphQLContextBase, GraphQLEndpoint } from "../../../apollo";
import { DesignAndEnvironmentParent } from "./graphql-types";
import * as CollectionsDAO from "../../collections/dao";
import { CollectionDb } from "../../collections/types";
import {
  gtCollection,
  gtCollectionDesignsMeta,
} from "../../collections/graphql-types";

export const CollectionEndpoint: GraphQLEndpoint<
  {},
  CollectionDb,
  GraphQLContextBase<CollectionDb>,
  DesignAndEnvironmentParent
> = {
  endpointType: "DesignAndEnvironment",
  types: [gtCollection, gtCollectionDesignsMeta],
  name: "collection",
  resolver: async (parent: DesignAndEnvironmentParent) => {
    const { designId } = parent;
    const collections = await CollectionsDAO.findByDesign(designId);
    return collections[0] || null;
  },
};
