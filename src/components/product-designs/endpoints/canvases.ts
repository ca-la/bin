import { GraphQLContextBase, GraphQLEndpoint } from "../../../apollo";
import {
  DesignAndEnvironmentParent,
  gtCanvasWithEnrichedComponents,
  gtComponentWithAssetLinks,
} from "./graphql-types";
import { CanvasWithEnrichedComponents } from "../../canvases";
import { findAllWithEnrichedComponentsByDesignId } from "../../canvases/dao";

export const CanvasesEndpoint: GraphQLEndpoint<
  {},
  CanvasWithEnrichedComponents[],
  GraphQLContextBase<CanvasWithEnrichedComponents[]>,
  DesignAndEnvironmentParent
> = {
  endpointType: "DesignAndEnvironment",
  types: [gtCanvasWithEnrichedComponents, gtComponentWithAssetLinks],
  name: "canvases",
  resolver: async (parent: DesignAndEnvironmentParent) => {
    const { designId } = parent;

    return findAllWithEnrichedComponentsByDesignId(designId);
  },
};
