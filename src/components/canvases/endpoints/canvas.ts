import {
  GraphQLContextBase,
  GraphQLEndpoint,
  NotFoundError,
  requireAuth,
  composeMiddleware,
  attachDesignFromCanvasId,
  attachDesignPermissions,
  requireDesignEditPermissions,
} from "../../../apollo";
import * as CanvasesDAO from "../dao";
import * as ComponentsDAO from "../../components/dao";
import { CanvasWithEnrichedComponents } from "../types";
import * as EnrichmentService from "../../../services/attach-asset-links";
import { gtCanvasWithEnrichedComponents } from "../../product-designs/endpoints/graphql-types";

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
      await trx.commit();

      const enrichedComponents = await Promise.all(
        components.map(EnrichmentService.addAssetLink)
      );
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
