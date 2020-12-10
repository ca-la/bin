import {
  GraphQLEndpoint,
  GraphQLContextAuthenticated,
  requireAuth,
  requireAdmin,
  composeMiddleware,
} from "../../apollo";
import { User } from "./types";
import { findById } from "./dao";
import * as GraphQLTypes from "./graphql-types";

interface UserArgs {
  id: string;
}

const user: GraphQLEndpoint<UserArgs, User, GraphQLContextAuthenticated> = {
  endpointType: "QUERY",
  types: [GraphQLTypes.Role, GraphQLTypes.User],
  name: "user",
  signature: "(id: String!): User!",
  middleware: composeMiddleware<
    UserArgs,
    GraphQLContextAuthenticated,
    GraphQLContextAuthenticated
  >(requireAuth, requireAdmin),
  resolver: async (_: any, args: UserArgs) => {
    const { id } = args;
    const userFound = await findById(id);

    if (!userFound) {
      throw new Error(`User "${id}" could not be found.`);
    }

    return userFound;
  },
};

export const UserEndpoints = [user];
