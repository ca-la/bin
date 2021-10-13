import Knex from "knex";
import db from "../../../services/db";
import {
  requireAuth,
  GraphQLEndpoint,
  GraphQLContextAuthenticated,
  NotFoundError,
  ForbiddenError,
} from "../../../apollo";
import { getCollectionPermissions } from "../../../services/get-permissions";
import { Collection, CollectionDb } from "../types";
import {
  gtCollection,
  gtCollectionAndEnvironment,
  CollectionAndEnvironmentParent,
} from "./graphql-types";
import * as CollectionsDAO from "../dao";

interface CollectionAndEnvironmentArgs {
  collectionId: string;
}

export const CollectionAndEnvironmentEndpoint: GraphQLEndpoint<
  CollectionAndEnvironmentArgs,
  CollectionAndEnvironmentParent,
  GraphQLContextAuthenticated<CollectionAndEnvironmentParent>
> = {
  endpointType: "Query",
  types: [gtCollectionAndEnvironment, gtCollection],
  name: "CollectionAndEnvironment",
  signature: `(collectionId: String): CollectionAndEnvironment`,
  middleware: requireAuth,
  resolver: async (
    _: any,
    args: CollectionAndEnvironmentArgs,
    context: GraphQLContextAuthenticated<CollectionAndEnvironmentParent>
  ) => {
    const { collectionId } = args;
    const { session } = context;
    const { role, userId } = session;

    const collectionDb: CollectionDb | null = await CollectionsDAO.findById(
      collectionId
    );
    if (collectionDb === null) {
      throw new NotFoundError("Collection not found");
    }

    const permissions = await db.transaction((trx: Knex.Transaction) =>
      getCollectionPermissions(trx, collectionDb, role, userId)
    );

    if (!permissions || !permissions.canView) {
      throw new ForbiddenError(
        "You don't have permission to view this collection"
      );
    }

    const collection: Collection = {
      ...collectionDb,
      designs: CollectionsDAO.convertCollectionDesignsDbMetaToDesignMeta(
        collectionDb.designs
      ),
      permissions,
    };

    return {
      collectionId,
      collection,
    };
  },
};
