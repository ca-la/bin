import uuid from "node-uuid";
import Knex from "knex";

import requireAuth from "../../middleware/require-auth";
import { buildRouter } from "../../services/cala-component/cala-router";

import ResourceNotFoundError from "../../errors/resource-not-found";
import InvalidDataError from "../../errors/invalid-data";
import { findByEmail as findUserByEmail } from "../users/dao";
import TeamUsersDAO from "./dao";
import { isUnsavedTeamUser, TeamUser } from "./types";

export default buildRouter("TeamUser" as const, "/team-users", TeamUsersDAO, {
  pickRoutes: ["create"],
  routeOptions: {
    create: {
      middleware: [requireAuth],
      async getModelFromBody(
        trx: Knex.Transaction,
        body: Record<string, any>
      ): Promise<TeamUser> {
        if (!isUnsavedTeamUser(body)) {
          throw new InvalidDataError(
            "You must provide the following data: teamId, userEmail, role"
          );
        }

        const user = await findUserByEmail(body.userEmail, trx);

        if (!user) {
          throw new ResourceNotFoundError(
            `Could not find user with email: ${body.userEmail}`
          );
        }

        return {
          id: uuid.v4(),
          teamId: body.teamId,
          userId: user.id,
          role: body.role,
        };
      },
    },
  },
});
