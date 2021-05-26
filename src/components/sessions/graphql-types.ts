import { GraphQLType } from "../../apollo/published-types/published-types";

export const Session: GraphQLType = {
  name: "Session",
  type: "type",
  body: {
    id: "String!",
    userId: "String!",
    createdAt: "GraphQLDateTime!",
    role: "Role!",
    expiresAt: "GraphQLDateTime",
    user: "User!",
  },
  requires: ["User", "Role"],
};
