import uuid from "node-uuid";

import {
  GraphQLContextBase,
  GraphQLEndpoint,
  NotFoundError,
  requireAuth,
  composeMiddleware,
  attachDesignFromCanvasId,
  attachDesignFromCanvasInput,
  attachDesignPermissions,
  requireDesignEditPermissions,
} from "../../../apollo";
import * as CanvasesDAO from "../dao";
import * as ComponentsDAO from "../../components/dao";
import { CanvasWithEnrichedComponents } from "../types";
import * as EnrichmentService from "../../../services/attach-asset-links";
import { gtCanvasWithEnrichedComponents } from "../../product-designs/endpoints/graphql-types";
import {
  ComponentWithImageAndOption,
  createCanvasAndComponents,
} from "../services/create-canvas-and-components";
import { Component, ComponentType } from "../../components/types";
import { CanvasInput, gtCanvasInput } from "./graphql-types";
import Asset from "../../assets/types";

interface DeleteCanvasArgs {
  canvasId: string;
}

export const DeleteCanvasEndpoint: GraphQLEndpoint<
  DeleteCanvasArgs,
  CanvasWithEnrichedComponents,
  GraphQLContextBase<CanvasWithEnrichedComponents>
> = {
  endpointType: "Mutation",
  types: [gtCanvasWithEnrichedComponents],
  name: "deleteCanvas",
  signature: "(canvasId: String!): CanvasWithEnrichedComponents",
  middleware: composeMiddleware(
    requireAuth,
    attachDesignFromCanvasId,
    attachDesignPermissions,
    requireDesignEditPermissions
  ),
  resolver: async (
    _: unknown,
    args: DeleteCanvasArgs,
    context: GraphQLContextBase<CanvasWithEnrichedComponents>
  ) => {
    const { transactionProvider } = context;
    const { canvasId } = args;
    const trx = await transactionProvider();

    try {
      const canvas = await CanvasesDAO.del(trx, canvasId);
      if (!canvas) {
        throw new NotFoundError(`Could not find canvas ${canvasId}`);
      }

      const components = await ComponentsDAO.findAllByCanvasId(canvasId, trx);

      const enrichedComponents = await Promise.all(
        components.map((component: Component) =>
          EnrichmentService.addAssetLink(component, trx)
        )
      );
      await trx.commit();
      const enrichedCanvas: CanvasWithEnrichedComponents = {
        ...canvas,
        components: enrichedComponents,
      };

      return enrichedCanvas;
    } catch (err) {
      await trx.rollback(err);
      throw err;
    }
  },
};

interface GenerateOptions {
  asset: Asset;
  userId: string;
  type: ComponentType;
}

export function generateComponent({
  asset,
  userId,
  type,
}: GenerateOptions): ComponentWithImageAndOption {
  const baseComponent = {
    image: {
      ...asset,
      createdAt: asset.createdAt.toISOString(),
      uploadCompletedAt: new Date().toString(),
    },
    id: uuid.v4(),
    createdAt: new Date(),
    createdBy: userId,
    deletedAt: null,
    parentId: null,
    assetPageNumber: null,
  };

  switch (type) {
    case ComponentType.Sketch:
      return {
        ...baseComponent,
        type: ComponentType.Sketch,
        sketchId: asset.id,
        materialId: null,
        artworkId: null,
      };
    case ComponentType.Artwork:
      return {
        ...baseComponent,
        type: ComponentType.Artwork,
        sketchId: null,
        materialId: null,
        artworkId: asset.id,
      };
    case ComponentType.Material:
      const materialOptionId = uuid.v4();
      return {
        ...baseComponent,
        type: ComponentType.Material,
        sketchId: null,
        materialId: materialOptionId,
        artworkId: null,
        option: {
          createdAt: new Date().toISOString(),
          id: materialOptionId,
          previewImageId: asset.id,
          title: asset.title || "",
          type: "FABRIC",
          userId,
        },
      };
  }
}

interface CreateCanvasArgs {
  canvas: CanvasInput;
}

export const CreateCanvasEndpoint: GraphQLEndpoint<
  CreateCanvasArgs,
  CanvasWithEnrichedComponents,
  GraphQLContextBase<CanvasWithEnrichedComponents>
> = {
  endpointType: "Mutation",
  types: [gtCanvasWithEnrichedComponents, gtCanvasInput],
  name: "createCanvas",
  signature: "(canvas: CanvasInput!): CanvasWithEnrichedComponents",
  middleware: composeMiddleware(
    requireAuth,
    attachDesignFromCanvasInput,
    attachDesignPermissions,
    requireDesignEditPermissions
  ),
  resolver: async (
    _: unknown,
    args: CreateCanvasArgs,
    context: GraphQLContextBase<CanvasWithEnrichedComponents>
  ) => {
    const { transactionProvider, session } = context;
    const { designId, title, asset, type, id, ordering } = args.canvas;
    const trx = await transactionProvider();

    if (!session) {
      throw new Error("Missing session");
    }

    try {
      const component = generateComponent({
        asset,
        userId: session.userId,
        type,
      });

      const canvas = await createCanvasAndComponents(trx, session.userId, {
        id,
        archivedAt: null,
        componentId: component.id,
        designId,
        title,
        ordering,
        components: [component],
        createdBy: session.userId,
        width: 0,
        height: 0,
        x: 0,
        y: 0,
      });
      await trx.commit();

      return { ...canvas, components: [canvas.components[0]] };
    } catch (err) {
      await trx.rollback(err);
      throw err;
    }
  },
};
