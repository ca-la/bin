import {
  buildGraphQLListType,
  schemaToGraphQLType,
  GraphQLType,
} from "../../../apollo/published-types";
import { teamSchema, Team } from "../types";
import { CollectionDb } from "../../collections/types";

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

export interface TeamAndEnvironmentParent {
  teamId: string;
}

export const gtTeamAndEnvironment: GraphQLType = {
  name: "TeamAndEnvironment",
  type: "type",
  body: {
    teamId: "String!",
    team: "Team",
    collections: {
      signature: "(limit: Int, offset: Int)",
      type: "[Collection]",
    },
  },
  requires: ["Team", "Collection"],
};

export interface TeamAndEnvironment extends TeamAndEnvironmentParent {
  team: Team;
  collections: CollectionDb[];
}
