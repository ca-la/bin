import {
  requireAuth,
  GraphQLContextAuthenticated,
  UpgradeTeamError,
  ForbiddenError,
  GraphQLEndpoint,
} from "../../../apollo";
import db from "../../../services/db";
import {
  gtCollection,
  CollectionInput,
  gtCollectionInput,
} from "./graphql-types";
import { Collection } from "../types";
import * as CollectionsDAO from "../dao";
import TeamUsersDAO from "../../team-users/dao";
import { getCollectionPermissions } from "../../../services/get-permissions";
import {
  checkCollectionsLimit,
  generateUpgradeBodyDueToCollectionsLimit,
} from "../../teams";
import { Role as TeamUserRole } from "../../team-users/types";

interface CreateArgs {
  collection: CollectionInput;
}

export const createEndpoint: GraphQLEndpoint<
  CreateArgs,
  Collection,
  GraphQLContextAuthenticated<Collection>
> = {
  endpointType: "Mutation",
  types: [gtCollection, gtCollectionInput],
  name: "createCollection",
  signature: `(collection: CollectionInput!): Collection`,
  middleware: requireAuth,
  resolver: async (
    _parent: any,
    args: CreateArgs,
    context: GraphQLContextAuthenticated<Collection>
  ) => {
    const { session } = context;
    const { collection: input } = args;

    if (session.role !== "ADMIN") {
      const checkResult = await checkCollectionsLimit(db, input.teamId);
      if (checkResult.isReached) {
        const upgradeBody = await generateUpgradeBodyDueToCollectionsLimit(
          db,
          input.teamId,
          checkResult.limit
        );
        throw new UpgradeTeamError(upgradeBody);
      }

      const teamUser = await TeamUsersDAO.findByUserAndTeam(db, {
        userId: session.userId,
        userEmail: null,
        teamId: input.teamId,
      });

      if (
        !teamUser ||
        ![
          TeamUserRole.OWNER,
          TeamUserRole.ADMIN,
          TeamUserRole.EDITOR,
          TeamUserRole.TEAM_PARTNER,
        ].includes(teamUser.role)
      ) {
        throw new ForbiddenError(
          "You are not allowed to create collections for this team"
        );
      }
    }

    const collectionDb = await CollectionsDAO.create({
      ...input,
      createdAt: new Date(),
      deletedAt: null,
      createdBy: session.userId,
      description: null,
    });

    const permissions = await getCollectionPermissions(
      db,
      collectionDb,
      session.role,
      session.userId
    );

    return {
      ...collectionDb,
      designs: [],
      permissions,
    };
  },
};
