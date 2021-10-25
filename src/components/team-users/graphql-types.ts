import { GraphQLType, schemaToGraphQLType } from "../../apollo/published-types";
import { registeredTeamUserSchema } from "./types";
import { gtUser } from "../users/graphql-types";

export const gtTeamUserRole: GraphQLType = {
  name: "TeamUserRole",
  type: "enum",
  body: `OWNER\n  ADMIN\n  EDITOR\n VIEWER\n TEAM_PARTNER`,
};

export const gtTeamUser = schemaToGraphQLType(
  "TeamUser",
  registeredTeamUserSchema,
  {
    depTypes: {
      user: gtUser,
      role: gtTeamUserRole,
    },
    bodyPatch: {
      userId: "String",
      userEmail: "String",
    },
  }
);
