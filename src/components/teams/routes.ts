import uuid from "node-uuid";

import requireAuth from "../../middleware/require-auth";

import TeamsDAO from "./dao";
import { isUnsavedTeam, Team } from "./types";
import { buildRouter } from "../../services/cala-component/cala-router";

export default buildRouter("Team" as const, "/teams", TeamsDAO, {
  pickRoutes: ["create"],
  routeOptions: {
    create: {
      middleware: [requireAuth],
      getModelFromBody: (body: Record<string, any>): Team => {
        if (!isUnsavedTeam(body)) {
          throw new Error("You must provide a title for the new team");
        }
        return {
          id: uuid.v4(),
          title: body.title,
          createdAt: new Date(),
          deletedAt: null,
        };
      },
    },
  },
});
