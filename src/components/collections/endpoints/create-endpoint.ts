import {
  requireAuth,
  GraphQLContextAuthenticated,
  UpgradeTeamError,
  ForbiddenError,
  GraphQLEndpoint,
} from "../../../apollo";
import db from "../../../services/db";
import {
  gtCollectionDb,
  CollectionInput,
  gtCollectionInput,
} from "./graphql-types";
import { CollectionDb } from "../types";
import * as CollectionsDAO from "../dao";
import TeamUsersDAO from "../../team-users/dao";
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
  CollectionDb,
  GraphQLContextAuthenticated<CollectionDb>
> = {
  endpointType: "Mutation",
  types: [gtCollectionDb, gtCollectionInput],
  name: "createCollection",
  signature: `(collection: CollectionInput!): CollectionDb`,
  middleware: requireAuth,
  resolver: async (
    _parent: any,
    args: CreateArgs,
    context: GraphQLContextAuthenticated<CollectionDb>
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

    return CollectionsDAO.create({
      ...input,
      createdAt: new Date(),
      deletedAt: null,
      createdBy: session.userId,
      description: null,
    });
  },
};
