import { z } from "zod";
import {
  buildGraphQLListType,
  schemaToGraphQLType,
  GraphQLType,
} from "../../../apollo/published-types";
import { teamSchema, teamDbSchema, Team } from "../types";
import { TeamUser } from "../../team-users/types";
import { Collection } from "../../collections/types";

export const gtTeamDb = schemaToGraphQLType("TeamDb", teamDbSchema);
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
  teamUser: TeamUser | null;
}

export const gtTeamAndEnvironment: GraphQLType = {
  name: "TeamAndEnvironment",
  type: "type",
  body: {
    teamId: "String!",
    team: "Team",
    teamUser: "TeamUser",
    collections: {
      signature: "(limit: Int, offset: Int)",
      type: "[Collection]",
    },
  },
  requires: ["Team", "TeamUser", "Collection"],
};

export interface TeamAndEnvironment extends TeamAndEnvironmentParent {
  team: Team;
  collections: Collection[];
}

const teamInputSchema = teamDbSchema.pick({
  id: true,
  title: true,
});

export const gtTeamInput: GraphQLType = schemaToGraphQLType(
  "TeamInput",
  teamInputSchema,
  {
    type: "input",
  }
);

export type TeamInput = z.infer<typeof teamInputSchema>;
