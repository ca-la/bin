import uuid from "node-uuid";

import requireAuth from "../../middleware/require-auth";
import { buildRouter } from "../../services/cala-component/cala-router";

import TeamUsersDAO from "./dao";
import { isUnsavedTeamUser, TeamUser } from "./types";

export default buildRouter("TeamUser" as const, "/team-users", TeamUsersDAO, {
  pickRoutes: ["create"],
  routeOptions: {
    create: {
      middleware: [requireAuth],
      getModelFromBody(body: Record<string, any>): TeamUser {
        if (!isUnsavedTeamUser(body)) {
          throw new Error(
            "You must provide the following data: teamId, userId, role"
          );
        }

        return {
          id: uuid.v4(),
          teamId: body.teamId,
          userId: body.userId,
          role: body.role,
        };
      },
    },
  },
});
