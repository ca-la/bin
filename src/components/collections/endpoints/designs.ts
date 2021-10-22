import {
  GraphQLContextWithTeamAndUser,
  GraphQLEndpoint,
} from "../../../apollo";
import {
  gtCollectionMeta,
  gtProductDesign,
} from "../../product-designs/endpoints/graphql-types";
import { gtApprovalStep } from "../../approval-steps/graphql-types";
import { CollectionAndEnvironmentParent } from "./graphql-types";
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
  types: [gtCollectionMeta, gtApprovalStep, gtProductDesign],
  name: "designs",
  signature: `: [ProductDesign]`,
  resolver: async (parent: CollectionAndEnvironmentParent) => {
    const { collectionId } = parent;

    return ProductDesignsDAO.findByCollectionId(collectionId);
  },
};
