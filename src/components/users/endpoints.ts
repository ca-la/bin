import {
  GraphQLEndpoint,
  GraphQLContextAuthenticated,
  requireAuth,
  requireAdmin,
  composeMiddleware,
  NotFoundError,
} from "../../apollo";
import { User } from "./types";
import { findById } from "./dao";
import { gtRole, gtUser } from "./graphql-types";

interface UserArgs {
  id: string;
}

const user: GraphQLEndpoint<
  UserArgs,
  User,
  GraphQLContextAuthenticated<User>
> = {
  endpointType: "Query",
  types: [gtRole, gtUser],
  name: "user",
  signature: "(id: String!): User!",
  middleware: composeMiddleware<
    UserArgs,
    User,
    GraphQLContextAuthenticated<User>,
    GraphQLContextAuthenticated<User>
  >(requireAuth, requireAdmin),
  resolver: async (_: any, args: UserArgs) => {
    const { id } = args;
    const userFound = await findById(id);

    if (!userFound) {
      throw new NotFoundError(`User "${id}" could not be found.`);
    }

    return userFound;
  },
};

export const UserEndpoints = [user];
