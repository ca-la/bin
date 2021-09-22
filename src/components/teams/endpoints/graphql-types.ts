import {
  buildGraphQLListType,
  schemaToGraphQLType,
  GraphQLType,
} from "../../../apollo/published-types";
import { teamSchema } from "../types";

export const gtTeam = schemaToGraphQLType("Team", teamSchema);

export const gtTeamList = buildGraphQLListType(gtTeam);

export const gtTeamFilter: GraphQLType = {
  type: "input",
  name: "TeamFilter",
  body: {
    userId: "String!",
  },
};

export interface TeamFilter {
  userId: string;
}
