import {
  GraphQLContextWithTeamAndUser,
  GraphQLEndpoint,
} from "../../../apollo";
import { gtProductDesign } from "../../product-designs/endpoints/graphql-types";
import { CollectionAndEnvironmentParent, gtCollection } from "./graphql-types";
import ProductDesign from "../../product-designs/domain-objects/product-design";
import ProductDesignsDAO from "../../product-designs/dao";

interface DesignsArgs {}

type Result = ProductDesign[];

export const DesignsEndpoint: GraphQLEndpoint<
  DesignsArgs,
  Result,
  GraphQLContextWithTeamAndUser<Result>,
  CollectionAndEnvironmentParent
> = {
  endpointType: "CollectionAndEnvironment",
  types: [gtCollection, gtProductDesign],
  name: "designs",
  signature: `: [ProductDesign]`,
  resolver: async (parent: CollectionAndEnvironmentParent) => {
    const { collectionId } = parent;

    return ProductDesignsDAO.findByCollectionId(collectionId);
  },
};
